/**
	 --------------------------------
	|   INFORMACIÓN  DEL  PROYECTO   |
	 --------------------------------

	Autores:		+ <202128383> - <Hernández Santiago Marco Antonio>
					+ <202044153> - <López Romero José Eduardo>
                    + <201904864> - <López Viveros Gabriel>

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

let container, stats, clock, gui, mixamoMixer, cicleMixer, cicleActions, mixamoActions, activeAction, previousAction;
let camera, scene, renderer,  mixamoModel, mixamoAnimations, cicleModel, cicleAnimations;

// OPCIONES (CONSTANTES) PARA MENÚ DE CICLOS
const ciclos = [ 'Pose_correcta', 'Tiro_correcto', 'Sostener_balon', 'Hacer_tiro', 'Movimiento_muñeca'];
// OPCIONES (CONSTANTES) PARA MENÚ DE CAPTURAS DE MOVIMIENTO
const capturas = [ 'Atrapa_pelota', 'Botar_pelota', 'Defensa', 'Salto', 'Idle_defensa' ];

// CONFIGURACIÓN DE PROPIEDAD Y VALOR INICIAL DEL CICLO DE ANIMACIÓN (CLIP)
// EL NOMBRE DE ESTA PROPIEDAD ('ciclo') ESTÁ VINCULADO CON EL NOMBRE A MOSTRAR EN EL MENÚ
// i.e. LO QUE SE MUESTRA EN EL MENÚ ES 'ciclo'. 	
const api = { ciclo: 'Atrapa_pelota' };

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
    //Carga del primer modelo.
    loader.load(
        './src/models/gltf/Poses_basket_propias.glb',
        function (gltf1) {
          // SE OBTIENE EL MODELO (scene) DEL ARCHIVO GLTF (.GLB)
          cicleModel = gltf1.scene;
          cicleAnimations = gltf1.animations;
          // SE AGREGA A LA ESCENA PRINCIPAL
          scene.add(cicleModel);
          cicleModel.visible = false;
          console.log(cicleAnimations);
    
          // Cargar el segundo modelo
          loader.load(
            './src/models/gltf/Poses_basketMixamo.glb',
            function (gltf2) {
              // SE OBTIENE EL MODELO (scene) DEL ARCHIVO GLTF (.GLB)
              mixamoModel = gltf2.scene;
              mixamoAnimations = gltf2.animations;
              // SE AGREGA A LA ESCENA PRINCIPAL
              scene.add(mixamoModel);
    
              console.log("Otro Modelo Creado");
                //Creación de la interfaz gráfica
              createGUI(mixamoModel, mixamoAnimations, cicleModel, cicleAnimations);
            },
            undefined,
            function (e) {
              // Manejar errores de carga del segundo modelo
              console.error("Error al cargar el segundo modelo:", e);
            }
          );
        },
        undefined,
        function (e) {
          // Manejar errores de carga del primer modelo
          console.error("Error al cargar el primer modelo:", e);
        }
      );
    /*loader.load( './src/models/gltf/RobotExpressive/RobotExpressive.glb', function ( gltf ) {
        // SE OBTIENE EL MODELO (scene) DEL ARCHIVO GLTF (.GLB)
        model = gltf.scene;
        // SE AGREGA A LA ESCENA PRINCIPAL
        scene.add( model );

        // CREACIÓN DE LA INTERFAZ GRÁFICA
        createGUI( model, gltf.animations );

    }, undefined, function ( e ) {
        // SE MUESTRA INFORMACIÓN DE ERROR
        console.error( e );
    } );*/

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
//ATENCIÓN AQUÍ PERRO
function createGUI( mixamoModel, mixamoAnimations, cicleModel, cicleAnimations ) {
    // INSTANCIACIÓN DEL OBJETO QUE CREA LA INTERFAZ
    gui = new GUI();
    // INSTANCIACIÓN DEL OBJETO QUE CONTROLA LA TRANSICIÓN (MEZCLA) ENTRE CLIPS DE ANIMACIÓN
    mixamoMixer = new THREE.AnimationMixer(mixamoModel);
    cicleMixer = new THREE.AnimationMixer( cicleModel );

    // ARREGLO VACÍO PARA LOS "CLIPS" DE ANIMACIÓN
    mixamoActions = {};
    cicleActions = {};

    // SE VISUALIZA EN CONSOLA LOS NOMBRES DE LAS ANIMACIONES
    console.log('Lista de animaciones: ');
    console.log(mixamoAnimations);
    
    // RECORRIDO DEL ARREGLO DE ANIMACIONES PASADO COMO PARÁMETRO
    for ( let i = 0; i < mixamoAnimations.length; i ++ ) {
        // TRANSFORMACIÓN DE ANIMACIONES A "CLIPS"
        const clip1 = mixamoAnimations[ i ];
        const action1 = mixamoMixer.clipAction( clip1 );
        mixamoActions[ clip1.name ] = action1;

        // SE CONFIGURAN LOS CLIPS QUE << NO >> REALIZARÁN UN LOOP INFINITO QUE SON:
        //
        // 	1. Todos aquellos cuyos nombres aparecen en el arreglo "capturas"
        // 		--> capturas.indexOf( clip.name ) >= 0
        //
        //	2. Sólo 'Death', 'Sitting' y 'Standing' del arreglo ciclos
        // 		--> ciclos.indexOf( clip.name ) >= 4
        //
        if ( capturas.indexOf( clip1.name ) >= 1) {
            action1.clampWhenFinished = true;
            action1.loop = THREE.LoopOnce;
        }
    }

    for (let i = 0; i < cicleAnimations.length; i++) {
        // TRANSFORMACIÓN DE ANIMACIONES A "CLIPS"
        const clip = cicleAnimations[i];
        const action = cicleMixer.clipAction(clip);
        cicleActions[clip.name] = action;
    }

    // ------------------ CICLOS ------------------
    // SE CONFIGURA EL MENÚ PARA SELECCIÓN DE CICLOS
    const ciclosFolder = gui.addFolder( 'Ciclos de Animación' );
    // SE CONFIGURA SUB-MENÚ (LISTA DESPLEGABLE)
    const clipCtrl = ciclosFolder.add( api, 'ciclo' ).options( ciclos );

    // SE DEFINE FUNCIÓN TIPO CallBack, EJECUTABLE CADA QUE SE SELECCIONE UNA OPCIÓN DEL MENÚ DESPLEGABLE
    clipCtrl.onChange( function () {
        console.log('Se seleccionó la opción "'+api.ciclo+'""');
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
            cicleMixer.addEventListener( 'finished', restoreState );
            mixamoMixer.addEventListener( 'finished', restoreState );
        };
        // SE LA OPCIÓN CON SU FUNCIÓN Y EL NOMBRE DE LA ANIMACIÓN
        capturaFolder.add( api, name );
    }

    // SE DEFINE FUNCIÓN TIPO CallBack, EJECUTABLE CADA QUE SE FINALICE UNA ACCIÓN
    function restoreState() {
        // SE REMUEVE LA FUNCIÓN CallBack QUE REGRESA AL ESTADO PREVIO (ciclo de animación) 
        cicleMixer.removeEventListener( 'finished', restoreState );
        mixamoMixer.removeEventListener( 'finished', restoreState );
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
    activeAction = mixamoActions[ 'Atrapa_pelota' ];
    activeAction.play();
}
/** ---------------------------------------------------------------------------------------------
DE PREFERENCIA ***NO MODIFICAR*** LAS SIGUIENTES FUNCIONES A MENOS QUE SEA ESTRICAMENTE NECESARIO
--------------------------------------------------------------------------------------------- **/

// FUNCIÓN PARA EL CONTROL DE TRANSICIONES ENTRE ANIMACIONES
function fadeToAction( name, duration ) {
    previousAction = activeAction;
    
    if (ciclos.includes(name)) {
        activeAction = cicleActions[name];
        cicleModel.visible = true;
        mixamoModel.visible = false;
    } else {
        activeAction = mixamoActions[name];
        mixamoModel.visible = true;
        cicleModel.visible = false;
     }

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

    if ( cicleMixer )
        cicleMixer.update( dt );
    
    if ( mixamoMixer )
      mixamoMixer.update( dt );

    requestAnimationFrame( animate );
    renderer.render( scene, camera );
    stats.update();
}