import React, { useEffect, useState } from 'react'

export default function Nav(){
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState(window.location.pathname + window.location.hash)

  useEffect(()=>{
    const onPop = ()=> setPath(window.location.pathname + window.location.hash)
    window.addEventListener('popstate', onPop)
    return ()=> window.removeEventListener('popstate', onPop)
  },[])

  function navigate(href){
    if(href.startsWith('#')){
      const id = href.slice(1)
      const el = document.getElementById(id)
      if(el){
        el.scrollIntoView({behavior:'smooth', block:'start'})
        history.pushState({}, '', window.location.pathname + href)
        setPath(window.location.pathname + href)
        setOpen(false)
        return
      }
      // If the target section isn't on this page, go to home with the hash
      history.pushState({}, '', '/' + href)
      setPath('/' + href)
      setOpen(false)
      // notify app to render landing, then try to scroll after a short delay
      const navEvent = new Event('navigation')
      window.dispatchEvent(navEvent)
      setTimeout(()=>{
        const el2 = document.getElementById(id)
        if(el2) el2.scrollIntoView({behavior:'smooth', block:'start'})
      }, 250)
      return
    }
    // regular navigation
    history.pushState({}, '', href)
    setPath(window.location.pathname)
    setOpen(false)
    window.scrollTo({top:0,behavior:'smooth'})
    // trigger re-render in parent if needed
    const navEvent = new Event('navigation')
    window.dispatchEvent(navEvent)
  }

  const links = [
    {label:'Home', href:'/'},
    {label:'Request a quote', href:'/upload'},
    {label:'FAQ', href:'/faq'},
    {label:'Sign in', href:'/signin'},
    {label:'My account', href:'/account'}
  ]

  return (
    <header className="site-nav">
      <div className="nav-inner">
        <div className="brand" onClick={()=>navigate('/') }>
          <img src="/logo.svg" alt="logo" />
        </div>
        <button className="menu-toggle" onClick={()=>setOpen(!open)} aria-label="Toggle menu">☰</button>
        <nav className={`nav-links ${open ? 'open' : ''}`}>
          {links.map(l=> {
            const isHome = l.href === '/'
            const isActive = isHome ? path === '/' : (path === l.href || path.startsWith(l.href))
            return (
              <a key={l.href} className={isActive ? 'active' : ''} onClick={(e)=>{e.preventDefault(); navigate(l.href)}} href={l.href}>{l.label}</a>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
