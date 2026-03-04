import * as THREE from 'three'
import { fetchRepos } from './github.js'
import './style.css'


function showUsernameScreen() {
  return new Promise((resolve) => {
    const screen = document.createElement('div')
    screen.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: #0a0a0a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 24px;
      z-index: 9999;
      font-family: monospace;
    `

    screen.innerHTML = `
      <div style="font-size: 42px; font-weight: bold; color: #4488ff;">
        REPOVERSE
      </div>
      <div style="color: #888; font-size: 16px;">
        Enter a GitHub username to explore their city
      </div>
      <input 
        id="username-input"
        type="text" 
        placeholder="e.g. torvalds"
        style="
          background: #1a1a1a;
          border: 1px solid #4488ff;
          border-radius: 8px;
          padding: 12px 20px;
          color: white;
          font-family: monospace;
          font-size: 18px;
          width: 300px;
          outline: none;
          text-align: center;
        "
      />
      <button id="explore-btn" style="
        background: #4488ff;
        border: none;
        border-radius: 8px;
        padding: 12px 32px;
        color: white;
        font-family: monospace;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        width: 300px;
      ">
        Explore City →
      </button>
      <div id="error-msg" style="color: #ff4444; font-size: 14px; display: none;">
        Username not found. Try again.
      </div>
    `

    document.body.appendChild(screen)

    // focus the input immediately
    setTimeout(() => {
      document.getElementById('username-input').focus()
    }, 100)

    async function handleSubmit() {
      const username = document.getElementById('username-input').value.trim()
      if (!username) return

      const btn = document.getElementById('explore-btn')
      const error = document.getElementById('error-msg')

      btn.textContent = 'Loading...'
      btn.style.opacity = '0.6'
      error.style.display = 'none'

      try {
        const repos = await fetchRepos(username)
        screen.remove()
        resolve(repos)
      } catch (e) {
        error.style.display = 'block'
        btn.textContent = 'Explore City →'
        btn.style.opacity = '1'
      }
    }

    document.getElementById('explore-btn').addEventListener('click', handleSubmit)

    document.getElementById('username-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSubmit()
    })
  })
}
// ── BACK BUTTON ────────────────────────────────────────
const backBtn = document.createElement('div')
backBtn.style.cssText = `
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid #4488ff;
  border-radius: 8px;
  padding: 8px 16px;
  color: white;
  font-family: monospace;
  font-size: 14px;
  cursor: pointer;
  z-index: 999;
`
backBtn.textContent = '← New Username'
backBtn.addEventListener('click', () => {
  window.location.reload()
})
document.body.appendChild(backBtn)
// ── USERNAME INPUT ─────────────────────────────────────
const repos = await showUsernameScreen()

// ── SCENE ──────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a0a)
scene.fog = new THREE.Fog(0x0a0a0a, 50, 200)

// ── CAMERA ─────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(0, 20, 80)

// ── RENDERER ───────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

// ── LIGHTS ─────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
scene.add(ambientLight)

const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(50, 100, 50)
dirLight.castShadow = true
scene.add(dirLight)

// ── GROUND ─────────────────────────────────────────────
const groundGeo = new THREE.PlaneGeometry(300, 300)
const groundMat = new THREE.MeshLambertMaterial({ color: 0x111111 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// ── BUILDING FUNCTION ──────────────────────────────────
function createBuilding(config) {
  const { x, z, width, height, depth, color } = config

  const floorHeight = 3        // each floor is 3 units tall
  const floorCount = Math.max(1, Math.floor(height / floorHeight))
  const gap = 0.1              // small gap between floors so they look separate

  for (let i = 0; i < floorCount; i++) {
    const geo = new THREE.BoxGeometry(width, floorHeight - gap, depth)
    const mat = new THREE.MeshLambertMaterial({ color })
    const floor = new THREE.Mesh(geo, mat)

    // stack each floor on top of the previous one
    const yPos = i * floorHeight + floorHeight / 2
    floor.position.set(x, yPos, z)
    floor.castShadow = true
    floor.userData = config

    scene.add(floor)
  }
}
function createWindows(config, floorCount) {
  const { x, z, width, height, depth, pushedAt } = config

  const now = Date.now()
  const daysSince = (now - new Date(pushedAt).getTime()) / (1000 * 60 * 60 * 24)

  let windowColor
  let intensity
  if (daysSince < 7)       { windowColor = 0xffff00; intensity = 1.0 }
  else if (daysSince < 30) { windowColor = 0xff8800; intensity = 0.6 }
  else                     { windowColor = 0x222222; intensity = 0.1 }

  const floorHeight = 3
  const windowW = width * 0.9
  const windowH = 2

  for (let i = 0; i < floorCount; i++) {
    const yPos = i * floorHeight + floorHeight / 2

    const sides = [
      // front — facing positive Z
      { pos: [x, yPos, z + depth / 2 + 0.01], rot: [0, 0, 0] },
      // back — facing negative Z
      { pos: [x, yPos, z - depth / 2 - 0.01], rot: [0, Math.PI, 0] },
      // right — facing positive X
      { pos: [x + width / 2 + 0.01, yPos, z], rot: [0, Math.PI / 2, 0] },
      // left — facing negative X
      { pos: [x - width / 2 - 0.01, yPos, z], rot: [0, -Math.PI / 2, 0] },
    ]

    sides.forEach(({ pos, rot }) => {
      const geo = new THREE.PlaneGeometry(windowW, windowH)
      const mat = new THREE.MeshStandardMaterial({
        color: windowColor,
        emissive: windowColor,
        emissiveIntensity: intensity,
        side: THREE.FrontSide
      })
      const win = new THREE.Mesh(geo, mat)
      win.position.set(...pos)
      win.rotation.set(...rot)
      scene.add(win)
    })
  }
}
function createLabel(text, x, y, z) {
  // 1. Create canvas and get drawing context
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')

  // 2. Draw dark background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.roundRect(10, 10, 492, 108, 20)
  ctx.fill()

  // 3. Draw the text
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 48px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, 64)

  // 4. Canvas becomes a texture
  const texture = new THREE.CanvasTexture(canvas)

  // 5. Texture goes into a material
  const material = new THREE.SpriteMaterial({ 
    map: texture, 
    transparent: true 
  })

  // 6. Material goes into the Sprite
  const sprite = new THREE.Sprite(material)

  // 7. Set size of the label in the world
  sprite.scale.set(15, 4, 1)

  // 8. Position it above the building
  sprite.position.set(x, y, z)

  // 9. Add to scene
  scene.add(sprite)

  return sprite
}
const buildings = []
repos.forEach(repo => {
  createBuilding(repo)
  
  const floorCount = Math.max(1, Math.floor(repo.height / 3))
  createWindows(repo, floorCount)
  
  createLabel(repo.name, repo.x, repo.height + 6, repo.z)
})

// ── POINTER LOCK — first person mouse look ─────────────
const euler = new THREE.Euler(0, 0, 0, 'YXZ')
let isLocked = false

// Click the canvas to enter first person mode
renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock()
})

document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === renderer.domElement
  instructions.style.display = isLocked ? 'none' : 'flex'
})

document.addEventListener('mousemove', (e) => {
  if (!isLocked) return

  const sensitivity = 0.002

  euler.setFromQuaternion(camera.quaternion)
  euler.y -= e.movementX * sensitivity
  euler.x -= e.movementY * sensitivity

  // Clamp vertical look so you can't flip upside down
  euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.x))

  camera.quaternion.setFromEuler(euler)
})

// ── WASD MOVEMENT ──────────────────────────────────────
const keys = {}
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true })
window.addEventListener('keyup',   (e) => { keys[e.key.toLowerCase()] = false })

function moveCamera() {
  const speed = 0.4

  const direction = new THREE.Vector3()
  camera.getWorldDirection(direction)
  direction.y = 0
  direction.normalize()

  const right = new THREE.Vector3()
  right.crossVectors(direction, new THREE.Vector3(0, 1, 0))
  right.normalize()

  if (keys['w']) camera.position.addScaledVector(direction, speed)
  if (keys['s']) camera.position.addScaledVector(direction, -speed)
  if (keys['a']) camera.position.addScaledVector(right, -speed)
  if (keys['d']) camera.position.addScaledVector(right, speed)
  if (keys['q']) camera.position.y += speed
  if (keys['e']) camera.position.y -= speed
}

// ── INSTRUCTIONS UI ────────────────────────────────────
const instructions = document.createElement('div')
instructions.style.cssText = `
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-family: monospace;
  font-size: 16px;
  background: rgba(0,0,0,0.5);
  gap: 12px;
  cursor: pointer;
`
instructions.innerHTML = `
  <div style="font-size:28px; font-weight:bold; color:#4488ff">REPOVERSE</div>
  <div>Click to enter the city</div>
  <div style="color:#888; font-size:13px">WASD to move &nbsp;|&nbsp; Mouse to look &nbsp;|&nbsp; Q/E to go up/down &nbsp;|&nbsp; ESC to exit</div>
`
instructions.addEventListener('click', () => {
  renderer.domElement.requestPointerLock()
})
document.body.appendChild(instructions)

// ── ANIMATE ────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate)
  moveCamera()
  renderer.render(scene, camera)
}
animate()

// ── RESIZE ─────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ── RAYCASTER — detects clicks on buildings ────────────
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()



window.addEventListener('mouseup', () => {
  if (!isLocked) return

  mouse.set(0, 0)
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(scene.children)

  if (intersects.length > 0) {
    const hit = intersects[0].object
    if (hit.userData && hit.userData.name) {
      showPanel(hit.userData)
      return
    }
  }

  // clicked nothing — close panel
  panel.style.display = 'none'
})
// ── INFO PANEL ─────────────────────────────────────────
const panel = document.createElement('div')
panel.style.cssText = `
  position: fixed;
  top: 50%;
  right: 30px;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid #4488ff;
  border-radius: 12px;
  padding: 24px;
  color: white;
  font-family: monospace;
  width: 280px;
  display: none;
  flex-direction: column;
  gap: 12px;
`
document.body.appendChild(panel)

function showPanel(data) {
  // format the date nicely
  const date = new Date(data.pushedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  panel.innerHTML = `
    <div style="font-size:18px; font-weight:bold; color:#4488ff">
      ${data.name}
    </div>

    <div style="color:#aaa; font-size:13px">
      ${data.isPrivate ? '🔒 Private' : '🌐 Public'}
    </div>

    <div style="display:flex; flex-direction:column; gap:8px; font-size:14px">
      <div>🗣 Language: <span style="color:#4488ff">${data.language || 'Unknown'}</span></div>
      <div>📅 Last push: <span style="color:#4488ff">${date}</span></div>
      <div>⚠️ Open issues: <span style="color:#ff6644">${data.issues}</span></div>
    </div>

    <a href="${data.url}" target="_blank" style="
      display: block;
      margin-top: 8px;
      padding: 10px;
      background: #4488ff;
      color: white;
      text-align: center;
      border-radius: 8px;
      text-decoration: none;
      font-size: 14px;
      font-weight: bold;
    ">Open on GitHub ↗</a>

    <div style="
      margin-top: 4px;
      color: #555;
      font-size: 12px;
      text-align: center;
      cursor: pointer;
    " id="close-panel">click anywhere to close</div>
  `

  panel.style.display = 'flex'
}

const crosshair = document.getElementById('crosshair')

document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === renderer.domElement
  instructions.style.display = isLocked ? 'none' : 'flex'
  crosshair.style.display = isLocked ? 'block' : 'none' // ← add this line
})