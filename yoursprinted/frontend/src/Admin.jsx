import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Admin(){
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(()=>{
    axios.defaults.baseURL = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5001/demo-project/us-central1/api'
    load()
  },[])

  async function load(){
    setLoading(true)
    const r = await axios.get('/orders')
    setOrders(r.data.orders || [])
    setLoading(false)
  }

  async function update(id, updates){
    await axios.patch(`/orders/${id}`, updates)
    load()
  }

  function filtered(){
    return orders.filter(o => {
      if(statusFilter !== 'all' && o.status !== statusFilter) return false
      if(!query) return true
      const q = query.toLowerCase()
      return (o.name || '').toLowerCase().includes(q) || (o.email || '').toLowerCase().includes(q) || (o.fileName || '').toLowerCase().includes(q) || (o.id||'').toLowerCase().includes(q)
    })
  }

  function exportCsv(){
    const rows = filtered()
    if(!rows.length) return alert('No rows to export')
    const header = ['id','name','email','fileName','estimatedPrice','status','assignedTo','eta','createdAt']
    const csv = [header.join(',')].concat(rows.map(r => header.map(h=>`"${(r[h]||'').toString().replace(/"/g,'""')}"`).join(','))).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'orders.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if(loading) return <div>Loading orders…</div>

  return (
    <div style={{padding:20}}>
      <h2>Admin — Orders</h2>

      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12}}>
        <input placeholder="Search by name, email, file, id" value={query} onChange={e=>setQuery(e.target.value)} style={{padding:8,flex:1}} />
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:8}}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In progress</option>
          <option value="complete">Complete</option>
        </select>
        <button onClick={load} style={{padding:8}}>Refresh</button>
        <button onClick={exportCsv} style={{padding:8}}>Export CSV</button>
      </div>

      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead>
          <tr>
            <th style={{textAlign:'left'}}>ID</th>
            <th style={{textAlign:'left'}}>User</th>
            <th style={{textAlign:'left'}}>File</th>
            <th style={{textAlign:'left'}}>Price</th>
            <th style={{textAlign:'left'}}>Status</th>
            <th style={{textAlign:'left'}}>ETA</th>
            <th style={{textAlign:'left'}}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered().map(o=> (
            <tr key={o.id} style={{borderTop:'1px solid #eee'}}>
              <td style={{padding:8,fontSize:12}}>{o.id}</td>
              <td style={{padding:8}}>{o.name} <div style={{fontSize:12,color:'#666'}}>{o.email}</div></td>
              <td style={{padding:8}}>
                <div>{o.fileName}</div>
                {o.downloadURL && (
                  <div style={{marginTop:6}}>
                    {o.downloadURL.startsWith('gs://') ? (
                      (() => {
                        const parts = o.downloadURL.replace('gs://','').split('/')
                        const bucket = parts.shift()
                        const path = parts.join('/')
                        const parsedThumb = path.replace(/(\.[^/.]+)$/, '') + '-thumb.svg'
                        const thumbUrl = `http://127.0.0.1:9199/v0/b/${bucket}/o/${encodeURIComponent(parsedThumb)}?alt=media`
                        return (
                          <div>
                            <div style={{marginBottom:8}}>
                              <img src={thumbUrl} alt="thumb" style={{maxWidth:160,maxHeight:120,border:'1px solid #ddd'}} onError={(e)=>{e.target.style.display='none'}} />
                            </div>
                            <div style={{fontSize:12,color:'#555'}}>Storage URL: {o.downloadURL}</div>
                          </div>
                        )
                      })()
                    ) : (
                      <a href={o.downloadURL} target="_blank" rel="noreferrer">Open file</a>
                    )}
                    <button onClick={()=>{navigator.clipboard && navigator.clipboard.writeText(o.downloadURL); alert('Copied URL')}} style={{marginLeft:8}}>Copy URL</button>
                  </div>
                )}
              </td>
              <td style={{padding:8}}>${o.estimatedPrice}</td>
              <td style={{padding:8}}>{o.status}</td>
              <td style={{padding:8}}>{o.eta || '-'}</td>
              <td style={{padding:8}}>
                <button onClick={()=>update(o.id,{status:'in-progress'})}>In progress</button>
                <button onClick={()=>update(o.id,{status:'complete'})} style={{marginLeft:8}}>Complete</button>
                <button onClick={()=>{
                  const eta = prompt('Set ETA (e.g. 2026-08-24 14:00)')
                  if(eta) update(o.id,{eta})
                }} style={{marginLeft:8}}>Set ETA</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
