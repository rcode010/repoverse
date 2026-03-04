import * as THREE from 'three'
import { fetchRepos } from './github.js'

const repos = await fetchRepos()
console.log(repos)

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
  const building = createBuilding(repo)
  const label = new THREE.Sprite()
  buildings.push(building)
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

