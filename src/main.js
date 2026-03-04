import * as THREE from 'three'

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

  const geo = new THREE.BoxGeometry(width, height, depth)
  const mat = new THREE.MeshLambertMaterial({ color })
  const building = new THREE.Mesh(geo, mat)

  building.position.set(x, height / 2, z)
  building.castShadow = true
  building.userData = config

  scene.add(building)
  return building
}

// ── FAKE CITY DATA ─────────────────────────────────────
const fakeRepos = [
  { name: 'auth-service',      x: -40, z: -20, width: 10, height: 40, depth: 10, color: 0x4488ff },
  { name: 'frontend-app',      x: -20, z:   0, width: 12, height: 25, depth: 12, color: 0x44bb88 },
  { name: 'payment-api',       x:   0, z: -30, width:  8, height: 60, depth:  8, color: 0xff6644 },
  { name: 'database-service',  x:  20, z:  10, width: 14, height: 15, depth: 14, color: 0xffaa00 },
  { name: 'admin-dashboard',   x:  40, z: -10, width: 10, height: 35, depth: 10, color: 0xaa44ff },
  { name: 'email-worker',      x: -30, z:  30, width:  8, height: 20, depth:  8, color: 0x4488ff },
  { name: 'search-engine',     x:   0, z:  20, width: 16, height: 50, depth: 16, color: 0xff4466 },
  { name: 'notification-api',  x:  30, z:  30, width:  9, height: 18, depth:  9, color: 0x44bbff },
  { name: 'analytics-service', x: -10, z: -50, width: 11, height: 45, depth: 11, color: 0x88ff44 },
  { name: 'file-storage',      x:  50, z:  20, width: 13, height: 22, depth: 13, color: 0xffdd44 },
]

const buildings = []
fakeRepos.forEach(repo => {
  const building = createBuilding(repo)
  buildings.push(building)
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