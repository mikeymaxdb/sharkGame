// Hours: 5
import * as THREE from 'three'

// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

import loadFish from 'utils/loadFish'

import Flashlight from 'components/Flashlight'
import Water from 'components/Water'

import 'style.scss'

let camera
let scene
let renderer
let water
let shark
const animations = []
const loadingFish = []
let fishes = []

let flashLight

let panX = 0
let panY = 0

let swimUp = false

const loader = new FBXLoader()
const clock = new THREE.Clock()
const lookAt = new THREE.Vector3(0, 1, 1)

function onWindowResize() {
    const container = document.getElementById('GLWindow')
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()

    renderer.setSize(container.clientWidth, container.clientHeight)
}

function onMouseMove(e) {
    panX += e.movementX
    panY += e.movementY
}

function init() {
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('WebGLCanvas'),
        antialias: true,
        shadowMap: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputEncoding = THREE.sRGBEncoding

    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x002233)
    scene.fog = new THREE.FogExp2(0x002233, 0.01)

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000)
    camera.position.set(0, -13, 0)
    // camera.position.set(0, 1, 0)
    camera.lookAt(lookAt)

    onWindowResize()

    const light = new THREE.AmbientLight(0x404040, 0.1)
    scene.add(light)

    flashLight = new Flashlight()
    scene.add(flashLight)
    scene.add(flashLight.target)
    flashLight.target.position.set(0, 0, 1000)

    water = new Water()
    scene.add(water)

    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshStandardMaterial({ roughness: 0 })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(0, 0, 20)
    scene.add(mesh)

    loader.load('assets/Shark.fbx', (model) => {
        shark = model
        shark.scale.setScalar(0.1)
        shark.traverse((c) => {
            if (c.isMesh) {
                c.castShadow = true
                c.receiveShadow = true
            }
        })
        scene.add(shark)
        shark.position.set(0, -13, 50)

        const sharkMixer = new THREE.AnimationMixer(shark)
        const action = sharkMixer.clipAction(shark.animations[0])
        action.timeScale = 5
        action.play()
        animations.push(sharkMixer)
    })

    for (let i = 0; i < 60; i += 1) {
        loadingFish.push(loadFish('assets/ClownFish.fbx', 0.02))
    }
    Promise.all(loadingFish).then((loadedFish) => {
        fishes = loadedFish
        fishes.forEach((f) => scene.add(f))
    })

    document.getElementById('WebGLCanvas').addEventListener('click', () => {
        document.getElementById('WebGLCanvas').requestPointerLock()
    })

    const onPointerLockChange = () => {
        if (document.pointerLockElement === document.getElementById('WebGLCanvas')) {
            document.addEventListener('mousemove', onMouseMove, false)
        } else {
            document.removeEventListener('mousemove', onMouseMove, false)
        }
    }

    const onKeyDown = (e) => {
        switch (e.code) {
            case 'KeyW':
                swimUp = true
                break
            default:
                break
        }
    }

    const onKeyUp = (e) => {
        switch (e.code) {
            case 'KeyW':
                swimUp = false
                break
            default:
                break
        }
    }

    window.addEventListener('resize', onWindowResize)
    document.addEventListener('pointerlockchange', onPointerLockChange, false)
    document.addEventListener('keydown', onKeyDown, false)
    document.addEventListener('keyup', onKeyUp, false)
}

function render() {
    const delta = clock.getDelta()

    animations.forEach((a) => a.update(delta))

    water.material.uniforms.time.value += 1.0 / 60.0

    if (swimUp) {
        camera.position.y = Math.max(-10, Math.min(2, camera.position.y + 0.05))
    } else {
        camera.position.y = Math.max(-10, Math.min(2, camera.position.y - 0.05))
    }

    // lookAt.y = camera.position.y + (panY / -100)
    lookAt.y = camera.position.y
    lookAt.applyAxisAngle(new THREE.Vector3(0, 1, 0), panX * (Math.PI / 180 / -5))

    flashLight.position.copy(camera.position)
    flashLight.target.position.copy(lookAt)
    camera.lookAt(lookAt)

    if (shark) {
        shark.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.PI * delta * 0.05))
        shark.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(shark.position.x, shark.position.z) - (Math.PI / 2))
    }

    const theta = Math.PI * delta * 0.01

    fishes.forEach((fish) => {
        fish.position.set(
            fish.position.x * Math.cos(theta) + fish.position.z * Math.sin(theta),
            fish.position.y,
            fish.position.z * Math.cos(theta) - fish.position.x * Math.sin(theta),
        )

        fish.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(fish.position.x, fish.position.z) - (Math.PI / 2))

        fish.mixer.update(delta)
    })

    renderer.render(scene, camera)

    panX = 0
    panY = 0
}

window.addEventListener('DOMContentLoaded', () => {
    function tick() {
        requestAnimationFrame(tick)
        render()
    }

    init()
    tick()
})
