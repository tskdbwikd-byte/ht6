import React from 'react'

function Feature({title, text}){
  return (
    <div className="card feature">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}

export default function Landing(){
  return (
    <main className="landing">
      <section className="hero">
        <div className="hero-body">
          <h1>YoursPrinted — Fast, affordable 3D printing</h1>
          <p className="lead">Upload your 3D files, get an instant estimate, and jump the community queue — small prints at low cost. Pickup locations are available across the GTA, including UofT, with delivery options for select partners.</p>
          <div className="cta-row">
            <a className="btn primary" href="/upload">Get Started</a>
            <a className="btn ghost" href="#how">How it works</a>
          </div>
        </div>
        {/* hero visual removed for cleaner layout */}
      </section>

      <section className="features">
        <Feature title="Low cost" text="We optimize print settings for minimal material waste and quick turnarounds." />
        <Feature title="Faster queue" text="Dedicated batches keep turnaround times short compared to commercial services." />
        <Feature title="Pickup locations" text="Pickup locations across the GTA, including UofT. Delivery options are available for select partners." />
      </section>

      <section id="how" className="how">
        <h2>How it works</h2>
        <div className="steps">
          <div className="card step"><strong>1</strong><p>Upload your STL/OBJ file and choose material.</p></div>
          <div className="card step"><strong>2</strong><p>Get an instant price estimate and pay securely.</p></div>
          <div className="card step"><strong>3</strong><p>We print in efficient batches. Pick up or request delivery.</p></div>
        </div>
      </section>

      <section className="pricing">
        <h2>Materials</h2>
        <div className="grid">
          <div className="card price">
            <h3>PLA</h3>
            <p>Standard filament: easy to print, economical, and great for prototypes and general-purpose parts.</p>
          </div>
          <div className="card price">
            <h3>PETG</h3>
            <p>Durable filament: stronger and more temperature resistant than PLA — good for functional parts.</p>
          </div>
        </div>

        <div style={{marginTop:16}}>
          <h3>Example orders (approximate)</h3>
          <ul>
            <li>Small keychain: approximately $4–7</li>
            <li>Small prototype: approximately $8–12</li>
            <li>Medium prototype: approximately $13–24</li>
          </ul>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-inner">
          <div>© {new Date().getFullYear()} YoursPrinted</div>
          <div><a href="#contact">Contact</a> · <a href="#">Privacy</a> · <a href="/admin">Admin</a></div>
        </div>
      </footer>
    </main>
  )
}
