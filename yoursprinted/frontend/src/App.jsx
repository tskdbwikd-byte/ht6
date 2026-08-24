import React, { useEffect, useState } from 'react'
import { auth, storage } from './firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import axios from 'axios'
import Admin from './Admin'
import FilePreview from './FilePreview'
import Landing from './Landing'
import Nav from './Nav'
import Upload from './Upload'
import SignIn from './SignIn'
import MyAccount from './MyAccount'
import FAQ from './FAQ'

// configure API base for local emulator or production
axios.defaults.baseURL = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5001/demo-project/us-central1/api'

export default function App(){
  const [file, setFile] = useState(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [estimate, setEstimate] = useState(null)
  const [thumbUrl, setThumbUrl] = useState(null)
  const [user, setUser] = useState(null)
  const [ordersUrl, setOrdersUrl] = useState(null)

  useEffect(()=>{
    return onAuthStateChanged(auth, u => setUser(u))
  },[])

  useEffect(()=>{
    const params = new URLSearchParams(window.location.search)
    const session = params.get('session_id')
    if(session) alert('Payment successful — thank you!')
  },[])

  async function signup(){
    try{
      await createUserWithEmailAndPassword(auth, email, 'changeme')
    }catch(err){
      alert(err.message)
    }
  }

  async function login(){
    try{
      await signInWithEmailAndPassword(auth, email, 'changeme')
    }catch(err){
      alert(err.message)
    }
  }

  async function logout(){
    await signOut(auth)
  }

  async function submit(e){
    e.preventDefault()
    if(!file) return alert('Select a file')
    if(!user) return alert('Please sign in first')

    // upload to Firebase Storage
    const storageRef = ref(storage, `uploads/${user.uid}/${Date.now()}_${file.name}`)
    const uploadTask = uploadBytesResumable(storageRef, file)
    uploadTask.on('state_changed', null, err => alert(err.message), async ()=>{
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
      // compute emulator thumbnail URL when possible
      try{
        const fullPath = uploadTask.snapshot.ref.fullPath || uploadTask.snapshot.ref._location && uploadTask.snapshot.ref._location.path_ || null
        const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com'
        if(fullPath){
          const parsedThumb = fullPath.replace(/(\.[^/.]+)$/, '') + '-thumb.svg'
          const candidate = `http://127.0.0.1:9199/v0/b/${bucket}/o/${encodeURIComponent(parsedThumb)}?alt=media`
          setThumbUrl(candidate)
        }
      }catch(e){ /* ignore */ }
      // estimate price (call backend)
      const est = await axios.post('/api/estimate', { volumeGrams: 50 })
      setEstimate(est.data.price)

      // submit order metadata
      const payload = {
        userId: user.uid,
        name,
        email,
        phone,
        fileName: file.name,
        downloadURL,
        estimatedPrice: est.data.price,
      }
      const res = await axios.post('/submit', payload)
      const orderId = res.data.id

      // create Stripe checkout (amount in cents)
      const amountCents = Math.round(parseFloat(est.data.price) * 100)
      const sess = await axios.post('/create-checkout-session', { amountCents, orderId })
      window.location.href = sess.data.url
    })
  }

  async function getQuote(e){
    e && e.preventDefault()
    if(!file) return alert('Please select a 3D file to get a quote')
    try{
      const est = await axios.post('/api/estimate', { volumeGrams: 50 })
      setEstimate(est.data.price)
    }catch(err){
      console.error(err); alert('Estimate failed')
    }
  }

  async function viewOrders(){
    const r = await axios.get('/orders')
    setOrdersUrl(JSON.stringify(r.data.orders, null, 2))
  }

  const isAdmin = user && user.email === 'admin@yoursprinted.example'
  const [path, setPath] = useState(window.location.pathname + window.location.hash)

  useEffect(()=>{
    const onNav = ()=> setPath(window.location.pathname + window.location.hash)
    window.addEventListener('navigation', onNav)
    const onPop = ()=> setPath(window.location.pathname + window.location.hash)
    window.addEventListener('popstate', onPop)
    return ()=>{
      window.removeEventListener('navigation', onNav)
      window.removeEventListener('popstate', onPop)
    }
  },[])
  if(path === '/upload'){
    return (
      <div className="app-shell">
        <Nav />
        <Upload />
      </div>
    )
  }
  if(path === '/signin'){
    return (
      <div className="app-shell">
        <Nav />
        <SignIn />
      </div>
    )
  }
  if(path === '/account'){
    return (
      <div className="app-shell">
        <Nav />
        <MyAccount />
      </div>
    )
  }
  if(path === '/faq'){
    return (
      <div className="app-shell">
        <Nav />
        <FAQ />
      </div>
    )
  }
  return (
    <div className="app-shell">
      <Nav />
      {path === '/' && <Landing />}
      {path === '/admin' && (isAdmin ? <Admin /> : <div style={{padding:24}}>Admin access only</div>)}
      {path !== '/' && path !== '/admin' && (
        <div style={{maxWidth:1100,margin:'24px auto',fontFamily:'sans-serif'}}>
        {!user && (
          <div className="signin-card">
            <h3>Sign in or create account</h3>
            <p style={{color:'var(--muted)',marginTop:6,marginBottom:12}}>Enter your email address to sign in or create an account.</p>
            <input placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
            <div className="signin-actions" style={{marginTop:12}}>
              <button onClick={login} className="btn primary">Sign in</button>
              <button onClick={signup} className="btn ghost">Create account</button>
            </div>
            <div style={{marginTop:12,color:'var(--muted)',fontSize:13}}>By creating an account you agree to our printing policies.</div>
          </div>
        )}

        {user && (
          <div>
            <div>Signed in as {user.email || user.uid} <button onClick={logout}>Sign out</button></div>
            <form onSubmit={(e)=>e.preventDefault()} style={{marginTop:12}}>
              <div style={{marginBottom:12}}>
                <label>Name</label><br/>
                <input value={name} onChange={e=>setName(e.target.value)} required />
              </div>
              <div style={{marginBottom:12}}>
                <label>Phone (optional)</label><br/>
                <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Optional" />
              </div>
              <div style={{marginBottom:12}}>
                <label>3D file (STL, STEP, 3MF, OBJ or ZIP)</label><br/>
                <input type="file" accept=".stl,.obj,.step,.stp,.3mf,.zip" onChange={e=>setFile(e.target.files[0])} />
                <div style={{color:'var(--muted)',fontSize:13,marginTop:8}}>Accepted: STL, STEP, 3MF, OBJ · Maximum 100 MB. Have multiple parts? Upload them together as a ZIP file.</div>
                {file && (
                  <div style={{marginTop:12}}>
                    <h4>Preview</h4>
                    <FilePreview file={file} width={480} height={320} />
                  </div>
                )}
              </div>
              <button type="button" className="btn primary" onClick={getQuote}>Get quote</button>
            </form>
            {estimate && <div>Estimated price: ${estimate}</div>}
            {thumbUrl && (
              <div style={{marginTop:12}}>
                <h4>Server thumbnail</h4>
                <img src={thumbUrl} alt="server thumb" style={{maxWidth:240,maxHeight:180,border:'1px solid #ddd'}} onError={(e)=>{e.target.style.display='none'}} />
              </div>
            )}
            {isAdmin && <div style={{marginTop:16}}>
              <button onClick={viewOrders}>Load Orders (admin)</button>
              {ordersUrl && <pre style={{whiteSpace:'pre-wrap'}}>{ordersUrl}</pre>}
            </div>}
          </div>
        )}
        </div>
      )}
    </div>
  )
}
