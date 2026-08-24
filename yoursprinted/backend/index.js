const functions = require('firebase-functions')
const admin = require('firebase-admin')
const express = require('express')
const cors = require('cors')
const path = require('path')

const Stripe = require('stripe')
const sgMail = require('@sendgrid/mail')
const fs = require('fs')
const Handlebars = require('handlebars')

// Initialize admin with explicit project and bucket to avoid metadata calls
admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'demo-project',
  storageBucket: process.env.STORAGE_BUCKET || (process.env.GCLOUD_PROJECT || 'demo-project') + '.appspot.com',
})

const stripe = Stripe(process.env.STRIPE_SECRET || 'sk_test_placeholder')
if(process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// Load and compile email templates
const templatesDir = path.join(__dirname, 'email_templates')
let orderHtmlTemplate = null
let orderTextTemplate = null
try{
  const htmlSrc = fs.readFileSync(path.join(templatesDir, 'order_update.html'), 'utf8')
  const txtSrc = fs.readFileSync(path.join(templatesDir, 'order_update.txt'), 'utf8')
  orderHtmlTemplate = Handlebars.compile(htmlSrc)
  orderTextTemplate = Handlebars.compile(txtSrc)
}catch(err){
  console.warn('Email templates not available:', err.message)
}

const app = express()
app.use(cors({ origin: true }))

// Simple in-memory rate limiter for quote submissions (per-IP)
const quoteRate = new Map()
function checkQuoteRate(ip){
  const WINDOW = 60 * 60 * 1000 // 1 hour
  const MAX = 20 // max quotes per IP per window
  const now = Date.now()
  let entry = quoteRate.get(ip)
  if(!entry || now - entry.start > WINDOW){
    entry = { start: now, count: 0 }
  }
  entry.count += 1
  quoteRate.set(ip, entry)
  return entry.count <= MAX
}

// Periodic cleanup to avoid memory leak
setInterval(()=>{
  const now = Date.now()
  const WINDOW = 2 * 60 * 60 * 1000
  for(const [ip, entry] of quoteRate.entries()){
    if(now - entry.start > WINDOW) quoteRate.delete(ip)
  }
}, 30 * 60 * 1000)

// Webhook endpoint must receive raw body for signature verification
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    // no verification in dev — accept and return
    res.status(200).send('no webhook secret configured')
    return
  }
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook error: ${err.message}`)
  }

  // handle relevant events
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    console.log('Checkout completed for', session.id)
    try {
      const db = admin.firestore()
      const orderId = session.client_reference_id || session.client_reference || null
      if (orderId) {
        const ref = db.collection('orders').doc(orderId)
        const snap = await ref.get()
        if (snap.exists) {
          await ref.update({
            status: 'paid',
            paidAt: new Date().toISOString(),
            stripeSessionId: session.id,
            stripePaymentIntent: session.payment_intent || null,
          })
          console.log('Order marked paid:', orderId)
        } else {
          console.warn('Order not found for checkout session client_reference_id:', orderId)
        }
      } else {
        console.warn('No client_reference_id on session, cannot map to order')
      }
    } catch (e) {
      console.error('Error updating order after checkout:', e)
    }
  }

  res.status(200).send('received')
})

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/estimate', (req, res) => {
  const { volumeGrams = 0, material = 'pla' } = req.body || {}
  const basePerGram = 0.05
  // Pricing multipliers by material: PLA (default) = 1, PETG = 1.15
  const materialMultiplier = material === 'petg' ? 1.15 : 1
  const price = Math.max(1, (volumeGrams * basePerGram * materialMultiplier)).toFixed(2)
  res.json({ price })
})

// Generate a signed upload URL for direct client upload to Storage
app.post('/api/upload-url', async (req, res) => {
  try {
    const { fileName, contentType } = req.body || {}
    console.log('upload-url called', { fileName, contentType, env_FIREBASE_STORAGE_EMULATOR_HOST: process.env.FIREBASE_STORAGE_EMULATOR_HOST })
    if(!fileName) return res.status(400).json({ error: 'fileName required' })
    const parsedName = path.basename(fileName)
    const dest = `uploads/${Date.now()}-${parsedName}`

    // If running against the Storage emulator, avoid using firebase-admin
    // signing (which may attempt to access metadata) and return a simple
    // emulator upload URL that the client can POST to directly.
    const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || process.env.STORAGE_EMULATOR_HOST
    if (emulatorHost) {
      const bucketName = process.env.STORAGE_BUCKET || (process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'demo-project') + '.appspot.com'
      const emulatorUrl = `http://${emulatorHost}/upload/storage/v1/b/${bucketName}/o?name=${encodeURIComponent(dest)}&uploadType=media`
      return res.json({ url: emulatorUrl, path: dest, emulator: true })
    }

    const bucket = admin.storage().bucket()
    const file = bucket.file(dest)

    // Signed URL for write
    const expires = Date.now() + 15 * 60 * 1000 // 15 minutes
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires,
      contentType: contentType || 'application/octet-stream',
    })

    return res.json({ url, path: dest })
  } catch (err) {
    console.error('upload-url error', err && (err.stack || err))
    const code = err && err.code
    const message = err && (err.message || err.toString())
    res.status(500).json({ error: message, code, stack: err && err.stack ? err.stack.split('\n').slice(0,5).join('\n') : undefined })
  }
})

// Create a Stripe Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { amountCents = 100, currency = 'usd', orderId } = req.body || {}
    const origin = req.headers.origin || `https://example.com`
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: 'YoursPrinted Order' },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      client_reference_id: orderId,
    })
    res.json({ url: session.url })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Submit order metadata (called after upload completes)
app.post('/submit', async (req, res) => {
  try {
    const data = req.body || {}
    const db = admin.firestore()
    const doc = await db.collection('orders').add({
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
    res.json({ id: doc.id })
  } catch (err) {
    console.error('submit error', err)
    res.status(500).json({ error: err.message })
  }
})

// Admin: list orders
app.get('/orders', async (req, res) => {
  try {
    const db = admin.firestore()
    const snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(100).get()
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    res.json({ orders })
  } catch (err) {
    console.error('orders error', err)
    res.status(500).json({ error: err.message })
  }
})

// Save anonymous or user quotes for later retrieval
app.post('/quotes', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || null
    if(!checkQuoteRate(ip)) return res.status(429).json({ error: 'Rate limit exceeded' })

    const data = req.body || {}
    const { email, phone, fileName, material, notes, estimate } = data

    // Basic validation
    if(!fileName || typeof fileName !== 'string' || fileName.length > 255) return res.status(400).json({ error: 'Invalid fileName' })
    if(material && typeof material !== 'string') return res.status(400).json({ error: 'Invalid material' })
    if(estimate && isNaN(Number(estimate))) return res.status(400).json({ error: 'Invalid estimate' })
    if(email && typeof email === 'string' && email.length > 254) return res.status(400).json({ error: 'Invalid email' })

    const db = admin.firestore()
    const doc = await db.collection('quotes').add({
      email: email || null,
      phone: phone || null,
      fileName: fileName || '',
      material: material || '',
      notes: notes || '',
      estimate: estimate || null,
      createdAt: new Date().toISOString(),
      ip: ip || null,
    })
    res.json({ id: doc.id })
  } catch (err) {
    console.error('quotes save error', err)
    res.status(500).json({ error: err.message })
  }
})

// List quotes, optionally filtered by email
app.get('/quotes', async (req, res) => {
  try {
    const { email } = req.query || {}
    const db = admin.firestore()
    let q = db.collection('quotes').orderBy('createdAt', 'desc').limit(200)
    if (email) q = q.where('email', '==', email)
    const snap = await q.get()
    const quotes = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    res.json({ quotes })
  } catch (err) {
    console.error('quotes list error', err)
    res.status(500).json({ error: err.message })
  }
})

// Return a downloadable URL for a server-generated thumbnail for a storage object
app.get('/api/thumbnail-url', async (req, res) => {
  try {
    const { path: objectPath } = req.query || {}
    if (!objectPath) return res.status(400).json({ error: 'path required' })

    const bucketName = process.env.STORAGE_BUCKET || (process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'demo-project') + '.appspot.com'
    const thumbPath = objectPath.replace(/(\.[^/.]+)$/, '-thumb.svg')

    // If running against the Storage emulator, return emulator download URL
    const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || process.env.STORAGE_EMULATOR_HOST
    if (emulatorHost) {
      const url = `http://${emulatorHost}/download/storage/v1/b/${bucketName}/o/${encodeURIComponent(thumbPath)}?alt=media`
      return res.json({ url })
    }

    // Production: use the public firebase storage REST endpoint
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(thumbPath)}?alt=media`
    res.json({ url })
  } catch (err) {
    console.error('thumbnail-url error', err)
    res.status(500).json({ error: err.message })
  }
})

// Claim an anonymous quote and attach it to a user (simple claim endpoint)
app.patch('/quotes/:id/claim', async (req, res) => {
  try {
    const id = req.params.id
    const { userId, email, createOrder } = req.body || {}
    const db = admin.firestore()
    const ref = db.collection('quotes').doc(id)
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ error: 'Quote not found' })
    const current = snap.data() || {}
    if (current.claimedAt) {
      return res.status(409).json({ error: 'Quote already claimed' })
    }

    const updates = { claimedAt: new Date().toISOString() }
    if (userId) updates.userId = userId
    if (email) updates.email = email

    await ref.update(updates)
    const updated = await ref.get()
    const result = { id: updated.id, ...updated.data() }

    // Optionally create an order document from the quote
    if (createOrder) {
      const orderData = {
        userId: result.userId || null,
        email: result.email || null,
        name: result.name || '',
        fileName: result.fileName || '',
        estimatedPrice: result.estimate || '',
        material: result.material || '',
        notes: result.notes || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        sourceQuoteId: result.id,
      }
      const orderRef = await db.collection('orders').add(orderData)
      result.createdOrderId = orderRef.id
    }

    res.json(result)
  } catch (err) {
    console.error('quote claim error', err)
    res.status(500).json({ error: err.message })
  }
})

// Create a Stripe Checkout session to pay for a quote and create an order
app.post('/quotes/:id/checkout', async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET) return res.status(501).json({ error: 'Stripe not configured on this environment' })
    const id = req.params.id
    const db = admin.firestore()
    const qref = await db.collection('quotes').doc(id).get()
    if (!qref.exists) return res.status(404).json({ error: 'Quote not found' })
    const quote = qref.data()

    const amountCents = Math.max(100, Math.round((Number(quote.estimate) || 0) * 100))

    // Create order record first
    const orderDoc = await db.collection('orders').add({
      sourceQuoteId: id,
      email: quote.email || null,
      fileName: quote.fileName || '',
      estimatedPrice: quote.estimate || '',
      amountCents,
      currency: 'usd',
      status: 'checkout_created',
      createdAt: new Date().toISOString(),
    })

    // Create Stripe Checkout Session
    const origin = req.headers.origin || 'https://example.com'
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `YoursPrinted Order ${orderDoc.id}` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      client_reference_id: orderDoc.id,
    })

    res.json({ url: session.url, sessionId: session.id, orderId: orderDoc.id })
  } catch (err) {
    console.error('checkout error', err)
    res.status(500).json({ error: err.message })
  }
})

// Update order metadata (status, assignedTo, eta)
app.patch('/orders/:id', async (req, res) => {
  try {
    const id = req.params.id
    const updates = req.body || {}
    const db = admin.firestore()
    await db.collection('orders').doc(id).update({ ...updates })
    res.json({ id })
  } catch (err) {
    console.error('order update error', err)
    res.status(500).json({ error: err.message })
  }
})

// Export for Firebase Functions
exports.api = functions.https.onRequest(app)

// Generate a lightweight SVG thumbnail when a 3D file is uploaded to Storage
exports.generateThumbnail = functions.storage.object().onFinalize(async (object) => {
  try {
    const filePath = object.name
    if (!filePath) return
    // skip thumbnails and non-3d files
    if (filePath.endsWith('-thumb.svg')) return
    if (!filePath.endsWith('.stl') && !filePath.endsWith('.obj')) return

    const bucket = admin.storage().bucket(object.bucket)
    const parsed = path.parse(filePath)
    const thumbPath = parsed.dir ? `${parsed.dir}/${parsed.name}-thumb.svg` : `${parsed.name}-thumb.svg`

    const filename = parsed.base
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">` +
      `<rect width="100%" height="100%" fill="#F7F7F8"/>` +
      `<g transform="translate(20,40)">` +
      `<rect x="0" y="0" width="160" height="120" rx="8" fill="#0EA5A2"/>` +
      `<text x="180" y="40" font-family="sans-serif" font-size="18" fill="#0F172A">${filename}</text>` +
      `<text x="180" y="70" font-family="sans-serif" font-size="12" fill="#6B7280">3D model preview</text>` +
      `</g></svg>`

    const file = bucket.file(thumbPath)
    await file.save(Buffer.from(svg), { contentType: 'image/svg+xml' })
    console.log('Saved thumbnail', thumbPath)
  } catch (err) {
    console.error('generateThumbnail error', err)
  }
})

// Notify user on order status changes via SendGrid
exports.notifyOnOrderUpdate = functions.firestore.document('orders/{id}').onUpdate(async (change, context) => {
  try {
    const before = change.before.data()
    const after = change.after.data()
    if(!before || !after) return null
    if(before.status === after.status) return null

    const to = after.email
    if(!to) return null

    const from = process.env.FROM_EMAIL || 'no-reply@yoursprinted.example'
    const subject = `YoursPrinted order ${context.params.id} — ${after.status}`

    const data = {
      orderId: context.params.id,
      status: after.status,
      name: after.name || '',
      fileName: after.fileName || '',
      estimatedPrice: after.estimatedPrice || '',
      eta: after.eta || 'TBD',
    }

    const text = orderTextTemplate ? orderTextTemplate(data) : `Order ${data.orderId} status: ${data.status}`
    const html = orderHtmlTemplate ? orderHtmlTemplate(data) : null

    if(!process.env.SENDGRID_API_KEY) {
      console.log('SENDGRID_API_KEY not set — skipping email to', to, 'subject:', subject)
      console.log('EMAIL PREVIEW TEXT:\n', text)
      return null
    }

    const msg = { to, from, subject, text }
    if(html) msg.html = html
    await sgMail.send(msg)
    console.log('Notification sent to', to)
    return null
  } catch (err) {
    console.error('notifyOnOrderUpdate error', err)
    return null
  }
})
