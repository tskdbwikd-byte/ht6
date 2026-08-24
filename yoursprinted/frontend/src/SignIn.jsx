import React, { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from './firebase'

export default function SignIn(){
  const [mode, setMode] = useState('signin') // 'signin' or 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function doSignIn(){
    setLoading(true)
    try{
      await signInWithEmailAndPassword(auth, email, password)
      history.pushState({}, '', '/')
      window.dispatchEvent(new Event('navigation'))
    }catch(err){
      alert(err.message)
    }finally{setLoading(false)}
  }

  async function doSignUp(){
    if(password.length < 6) return alert('Password must be at least 6 characters')
    if(password !== confirm) return alert('Passwords do not match')
    setLoading(true)
    try{
      await createUserWithEmailAndPassword(auth, email, password)
      history.pushState({}, '', '/')
      window.dispatchEvent(new Event('navigation'))
    }catch(err){
      alert(err.message)
    }finally{setLoading(false)}
  }

  return (
    <div style={{maxWidth:760,margin:'40px auto'}}>
      <div className="signin-card">
        <h3>{mode === 'signin' ? 'Sign in' : 'Create account'}</h3>
        <p style={{color:'var(--muted)'}}>{mode === 'signin' ? 'Sign in with your email and password.' : 'Create an account to manage your orders.'}</p>
        <label style={{fontSize:13,color:'var(--muted)'}}>Email</label>
        <input placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
        <label style={{fontSize:13,color:'var(--muted)',marginTop:8}}>Password</label>
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {mode === 'signup' && (
          <>
            <label style={{fontSize:13,color:'var(--muted)',marginTop:8}}>Confirm password</label>
            <input placeholder="Confirm password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} />
          </>
        )}

        <div style={{display:'flex',gap:8,marginTop:12}}>
          {mode === 'signin' ? (
            <button className="btn primary" onClick={doSignIn} disabled={loading}>{loading? 'Signing in...':'Sign in'}</button>
          ) : (
            <button className="btn primary" onClick={doSignUp} disabled={loading}>{loading? 'Creating...':'Create account'}</button>
          )}
          <button className="btn ghost" onClick={()=>{ setMode(mode === 'signin' ? 'signup' : 'signin'); setPassword(''); setConfirm('') }} disabled={loading}>
            {mode === 'signin' ? "Don't have an account? Create account" : 'Have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
