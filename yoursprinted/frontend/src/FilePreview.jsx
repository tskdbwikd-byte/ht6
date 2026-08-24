import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'

export default function FilePreview({ file, url, width = 600, height = 360 }){
  const mountRef = useRef(null)

  useEffect(()=>{
    const mount = mountRef.current
    if(!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf7f7f8)

    const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 1000)
    camera.position.set(0, 0, 100)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    mount.innerHTML = ''
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(0, 0, 1).normalize()
    scene.add(light)

    const ambient = new THREE.AmbientLight(0x888888)
    scene.add(ambient)

    const loader = new STLLoader()
    let mesh = null

    function addGeometry(geometry){
      const material = new THREE.MeshStandardMaterial({ color: 0x8888ff })
      mesh = new THREE.Mesh(geometry, material)
      geometry.computeBoundingBox()
      const bbox = geometry.boundingBox
      const size = new THREE.Vector3()
      bbox.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 60 / maxDim
      mesh.scale.set(scale, scale, scale)
      mesh.position.set(- (bbox.max.x + bbox.min.x) / 2 * scale, - (bbox.max.y + bbox.min.y) / 2 * scale, 0)
      scene.add(mesh)
    }

    async function loadArrayBuffer(ab){
      const geom = loader.parse(ab)
      addGeometry(geom)
    }

    if(file){
      const reader = new FileReader()
      reader.onload = e => {
        const ab = e.target.result
        loadArrayBuffer(ab)
      }
      reader.readAsArrayBuffer(file)
    } else if(url){
      fetch(url).then(r=>r.arrayBuffer()).then(ab=>loadArrayBuffer(ab)).catch(err=>console.error('fetch stl',err))
    }

    const animate = function(){
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return ()=>{
      if(mesh) scene.remove(mesh)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  },[file, url, width, height])

  return (
    <div ref={mountRef} style={{width, height, border:'1px solid #ddd'}} />
  )
}
