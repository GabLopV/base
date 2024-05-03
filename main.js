/**
	 --------------------------------
	|   INFORMACIÓN  DEL  PROYECTO   |
	 --------------------------------

	Autores:		+ <matricula1> - <nombre1>
					+ <matricula2> - <nombre2>

	Propósito:		1. Importar modelos y animaciones 3D en Blender
					2. Programar una aplicación Web interactiva
					3. Permitir al usuario interactuar con modelos y animaciones

	Versión bases:	three.js: https://threejs.org/examples/?q=skinning#webgl_animation_skinning_morph
**/
import * as THREE from './build/three.module.js';

import Stats from './src/jsm/libs/stats.module.js';
import { GUI } from './src/jsm/libs/dat.gui.module.js';
import { OrbitControls } from './src/jsm/controls/OrbitControls.js';
import { GLTFLoader } from './src/jsm/loaders/GLTFLoader.js';

let container, stats, clock, gui, mixer, actions, activeAction, previousAction;
let camera, scene, renderer, model;

// CONFIGURACIÓN DE PROPIEDAD Y VALOR INICIAL DEL CICLO DE ANIMACIÓN (CLIP)
// EL NOMBRE DE ESTA PROPIEDAD ('ciclo') ESTÁ VINCULADO CON EL NOMBRE A MOSTRAR EN EL MENÚ
// i.e. LO QUE SE MUESTRA EN EL MENÚ ES 'ciclo'. 	
const api = { ciclo: 'Idle' };

init();
animate();

function init() {
    // SE CREA UN CONTENEDOR Y SE VINCULA CON EL DOCUMENTO (HTML)
    container = document.createElement( 'div' );
    document.body.appendChild( container );
    // SE CREA Y CONFIGURA LA CÁMARA PRINCIPAÑL
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 100 );
    camera.position.set( - 5, 3, 10 );
    camera.lookAt( new THREE.Vector3( 0, 2, 0 ) );
    // SE CREA LA ESCENA Y SE ASIGNA COLOR DE FONDO
    scene = new THREE.Scene();
    // SE CONFIGURA EL COLOR DE FONDO
    scene.background = new THREE.Color( 0x90aede ); //e0e0e0
    // SE CONFIGURA LA NEBLINA
    scene.fog = new THREE.Fog( 0x90aede, 10, 17 ); //0x90aede, 20, 100

    // SE CREA UN RELOJ
    clock = new THREE.Clock();

    // ------------------ LUCES ------------------
    // LUZ HEMISFÉRICA
    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
    hemiLight.position.set( 0, 20, 0 );
    scene.add( hemiLight );
    // LUZ DIRECCIONAL
    const dirLight = new THREE.DirectionalLight( 0xffffff );
    dirLight.position.set( 0, 20, 10 );
    scene.add( dirLight );

    // ------------------ PISO ------------------
    // CREACIPON DE LA MALLA PARA EL PSIO
    const mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 10, 10 ), 
                                // MATERIAL (color)
                                 new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
    mesh.rotation.x = - Math.PI / 2;
    scene.add( mesh );
    // CREACIÓN DE CUADRICULA "GUÍA"
    const grid = new THREE.GridHelper( 10, 4, 0xff0000, 0x000000 );
    // OPACIDAD DE LAS LÍNEAS (lo opuesto a transparencia)
    //		0.0 = transparente
    //		1.0 = sin transparencia
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add( grid );

    // ------------------ MODELO 3D ------------------

    const loader = new GLTFLoader();
    loader.load( './src/models/gltf/RobotExpressive/RobotExpressive.glb', function ( gltf ) {
        // SE OBTIENE EL MODELO (scene) DEL ARCHIVO GLTF (.GLB)
        model = gltf.scene;
        // SE AGREGA A LA ESCENA PRINCIPAL
        scene.add( model );

        // CREACIÓN DE LA INTERFAZ GRÁFICA
        createGUI( model, gltf.animations );

    }, undefined, function ( e ) {
        // SE MUESTRA INFORMACIÓN DE ERROR
        console.error( e );
    } );

    // PROCESO DE RENDERIZADO DE LA ESCENA
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild( renderer.domElement );

    // CONFIGURACIÓN DE FUNCION CallBack EN CASO DE CAMBIO DE TAMAÑO DE LA VENTANA
    window.addEventListener( 'resize', onWindowResize, false );

    // CONTROL DE ORBITACIÓN CON EL MOUSE
    const controls = new OrbitControls( camera, renderer.domElement );
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.target.set( 0, 2, 0 );
    controls.update();

    // ------------------ ESTADOS ------------------
    stats = new Stats();
    container.appendChild( stats.dom );

}

function createGUI( model, animations ) {
    // OPCIONES (CONSTANTES) PARA MENÚ DE CICLOS
    const ciclos = [ 'Idle', 'Walking', 'Running', 'Dance', 'Death', 'Sitting', 'Standing' ];
    // OPCIONES (CONSTANTES) PARA MENÚ DE CAPTURAS DE MOVIMIENTO
    const capturas = [ 'Jump', 'Yes', 'No', 'Wave', 'Punch', 'ThumbsUp' ];

    // INSTANCIACIÓN DEL OBJETO QUE CREA LA INTERFAZ
    gui = new GUI();
    // INSTANCIACIÓN DEL OBJETO QUE CONTROLA LA TRANSICIÓN (MEZCLA) ENTRE CLIPS DE ANIMACIÓN
    mixer = new THREE.AnimationMixer( model );

    // ARREGLO VACÍO PARA LOS "CLIPS" DE ANIMACIÓN
    actions = {};

    // SE VISUALIZA EN CONSOLA LOS NOMBRES DE LAS ANIMACIONES
    console.log('Lista de animaciones: ');
    console.log(animations);
    
    // RECORRIDO DEL ARREGLO DE ANIMACIONES PASADO COMO PARÁMETRO
    for ( let i = 0; i < animations.length; i ++ ) {
        // TRANSFORMACIÓN DE ANIMACIONES A "CLIPS"
        const clip = animations[ i ];
        const action = mixer.clipAction( clip );
        actions[ clip.name ] = action;

        // SE CONFIGURAN LOS CLIPS QUE << NO >> REALIZARÁN UN LOOP INFINITO QUE SON:
        //
        // 	1. Todos aquellos cuyos nombres aparecen en el arreglo "capturas"
        // 		--> capturas.indexOf( clip.name ) >= 0
        //
        //	2. Sólo 'Death', 'Sitting' y 'Standing' del arreglo ciclos
        // 		--> ciclos.indexOf( clip.name ) >= 4
        //
        if ( capturas.indexOf( clip.name ) >= 0 || ciclos.indexOf( clip.name ) >= 4 ) {
            action.clampWhenFinished = true;
            action.loop = THREE.LoopOnce;
        }
    }

    // ------------------ CICLOS ------------------
    // SE CONFIGURA EL MENÚ PARA SELECCIÓN DE CICLOS
    const ciclosFolder = gui.addFolder( 'Ciclos de animación' );
    // SE CONFIGURA SUB-MENÚ (LISTA DESPLEGABLE)
    const clipCtrl = ciclosFolder.add( api, 'ciclo' ).options( ciclos );

    // SE DEFINE FUNCIÓN TIPO CallBack, EJECUTABLE CADA QUE SE SELECCIONE UNA OPCIÓN DEL MENÚ DESPLEGABLE
    clipCtrl.onChange( function () {
        console.log('se seleccionó la opción "'+api.ciclo+'""');
        // SEGÚN EL CICLO SELECCIONADO, SE USA SU NOMBRE Y UN VALOR NUMÉRICO (duración)
        fadeToAction( api.ciclo, 0.5 );
    } );
    // SE CREA MENÚ
    ciclosFolder.open();

    // ------------------ CAPTURAS ------------------
    // SE CONFIGURA EL MENÚ PARA SELECCIÓN DE CAPTURAS
    const capturaFolder = gui.addFolder( 'Captura de Movimiento' );

    // SE DEFINE FUNCIÓN TIPO CallBack, EJECUTABLE CADA QUE SE SELECCIONE UNA OPCIÓN DEL MENÚ
    function crearCapturaCallback( name ) {
        api[ name ] = function () {
            console.log('se dio clic sobre la opción "'+name+'""');
            // SE ACTIVA LA ANIMACIÓN DE LA CAPTURA DE MOVIMIENTO, CON UNA TRANSICIÓN DE 0.2 SEGUNDOS
            fadeToAction( name, 0.2 );
            // SE ESPECIFICA LA FUNCIÓN CallBack QUE REGRESA AL ESTADO PREVIO (ciclo de animación) 
            mixer.addEventListener( 'finished', restoreState );
        };
        // SE LA OPCIÓN CON SU FUNCIÓN Y EL NOMBRE DE LA ANIMACIÓN
        capturaFolder.add( api, name );
    }

    // SE DEFINE FUNCIÓN TIPO CallBack, EJECUTABLE CADA QUE SE FINALICE UNA ACCIÓN
    function restoreState() {
        // SE REMUEVE LA FUNCIÓN CallBack QUE REGRESA AL ESTADO PREVIO (ciclo de animación) 
        mixer.removeEventListener( 'finished', restoreState );
        // SE RE-ACTIVA EL CICLO DE ANIMACIÓN ACTUAL, CON UNA TRANSICIÓN DE 0.2 SEGUNDOS
        fadeToAction( api.ciclo, 0.2 );
    }
    
    // SE AGREGAN LAS OPCIONES AL MENÚ (YA CONFIGURADAS CON SU CallBack)
    for ( let i = 0; i < capturas.length; i ++ ) {
        crearCapturaCallback( capturas[ i ] );
    }
    // SE CREA MENÚ
    capturaFolder.open();

    // SE DEFINE CICLO DE ANIMACIÓN INICIAL
    activeAction = actions[ 'Idle' ];
    activeAction.play();
}
/** ---------------------------------------------------------------------------------------------
DE PREFERENCIA ***NO MODIFICAR*** LAS SIGUIENTES FUNCIONES A MENOS QUE SEA ESTRICAMENTE NECESARIO
--------------------------------------------------------------------------------------------- **/

// FUNCIÓN PARA EL CONTROL DE TRANSICIONES ENTRE ANIMACIONES
function fadeToAction( name, duration ) {
    previousAction = activeAction;
    activeAction = actions[ name ];

    if ( previousAction !== activeAction ) {
        previousAction.fadeOut( duration );
    }

    activeAction
        .reset()
        .setEffectiveTimeScale( 1 )
        .setEffectiveWeight( 1 )
        .fadeIn( duration )
        .play();
}

// FUNCIÓN PARA EL REESCALADO DE VENTANA
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

// PARA LA ANIMACIÓN - INVOCACIÓN RECURSIVA
function animate() {
    const dt = clock.getDelta();

    if ( mixer )
        mixer.update( dt );

    requestAnimationFrame( animate );
    renderer.render( scene, camera );
    stats.update();
}