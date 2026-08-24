import React, { useEffect, useState } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import axios from 'axios'

export default function MyAccount(){
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState(null)
  const [quotes, setQuotes] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, u=>{
      setUser(u)
    })
    return () => unsub()
  },[])

  useEffect(()=>{
    async function load(){
      if(!user) return
      setLoading(true)
      try{
        const res = await axios.get('/orders')
        const all = res.data.orders || res.data || []
        // filter orders for this user by uid or email
        const mine = all.filter(o => (o.userId && user.uid && o.userId === user.uid) || (o.email && user.email && o.email === user.email))
        setOrders(mine)
      }catch(err){
        console.error(err)
        setOrders([])
      }finally{setLoading(false)}
    }
    load()
  },[user])

  useEffect(()=>{
    async function loadQuotes(){
      if(!user) return
      try{
        const res = await axios.get('/quotes', { params: { email: user.email } })
        const list = res.data.quotes || []
        setQuotes(list)
      }catch(err){
        console.error('quotes load error', err)
        setQuotes([])
      }
    }
    loadQuotes()
  },[user])

  async function claimQuote(id){
    if(!user) return alert('Please sign in to claim')
    try{
      await axios.patch(`/quotes/${id}/claim`, { userId: user.uid, email: user.email })
      // refresh
      const res = await axios.get('/quotes', { params: { email: user.email } })
      setQuotes(res.data.quotes || [])
      alert('Quote claimed and attached to your account')
    }catch(err){
      console.error('claim error', err)
      alert('Could not claim quote')
    }
  }

  async function claimAndCreateOrder(id){
    if(!user) return alert('Please sign in to claim')
    try{
      const res = await axios.patch(`/quotes/${id}/claim`, { userId: user.uid, email: user.email, createOrder: true })
      // refresh
      const list = await axios.get('/quotes', { params: { email: user.email } })
      setQuotes(list.data.quotes || [])
      if(res.data && res.data.createdOrderId) alert('Quote claimed and order created: ' + res.data.createdOrderId)
      else alert('Quote claimed')
    }catch(err){
      console.error('claim+order error', err)
      alert('Could not claim and create order')
    }
  }

  async function payForQuote(id){
    try{
      const res = await axios.post(`/quotes/${id}/checkout`)
      if(res.data && res.data.url){
        // redirect to Stripe Checkout
        window.location.href = res.data.url
      } else {
        alert('Checkout not available: ' + (res.data && res.data.error))
      }
    }catch(err){
      console.error('checkout error', err)
      alert('Could not start checkout')
    }
  }

  if(!user) return (
    <div style={{maxWidth:900,margin:'24px auto',padding:20}}>
      <h2>My account</h2>
      <p>Please <a href="/signin">sign in</a> to view your orders and account settings.</p>
    </div>
  )

  return (
    <div style={{maxWidth:900,margin:'24px auto',padding:20}}>
      <h2>My account</h2>
      <div>Signed in as <strong>{user.email || user.uid}</strong></div>
      <div style={{marginTop:16}}>
        <h3>Your orders</h3>
        {loading && <div>Loading…</div>}
        {!loading && orders && orders.length === 0 && <div>No orders found.</div>}
        {!loading && orders && orders.map(o=> (
          <div key={o.id || o.orderId || Math.random()} style={{marginTop:12}} className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700}}>{o.fileName || 'Unnamed file'}</div>
                <div style={{color:'var(--muted)'}}>{o.createdAt || o.created || ''}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div>{o.estimatedPrice ? `$${o.estimatedPrice}` : ''}</div>
                <div style={{color:'var(--muted)'}}>{o.status || o.state || ''}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:24}}>
        <h3>Saved quotes</h3>
        {!quotes && <div style={{color:'var(--muted)'}}>Loading…</div>}
        {quotes && quotes.length === 0 && <div>No saved quotes.</div>}
        {quotes && quotes.map(q=> (
          <div key={q.id} style={{marginTop:12}} className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700}}>{q.fileName || 'Unnamed'}</div>
                <div style={{color:'var(--muted)'}}>{q.createdAt || ''}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div>{q.estimate ? `$${q.estimate}` : ''}</div>
                <div style={{color:'var(--muted)'}}>{q.email || ''}</div>
                {q.email !== user.email && <div style={{marginTop:8,display:'flex',gap:8}}>
                  <button className="btn" onClick={()=>claimQuote(q.id)}>Claim</button>
                  <button className="btn primary" onClick={()=>claimAndCreateOrder(q.id)}>Claim & Create Order</button>
                </div>}
                <div style={{marginTop:8}}>
                  <button className="btn" onClick={()=>payForQuote(q.id)}>Pay</button>
                </div>
              </div>
            </div>
            <div style={{marginTop:8,color:'var(--muted)'}}>{q.notes || ''}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
