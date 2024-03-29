// Canvas
var canvas;

// GL variables
var gl = null,
	program = null;

var chunkMng;

// Drawing environment variables
var	skyBox = null,
	skyboxLattx = null,
	skyboxTbtx = null;

var aspectRatio;
var lookRadius = 10.0;

// ASSETS
// Vertex shader
var vs;
// Fragment shader
var fs;
var droneObj;
var terrainObj;
var skyBoxObj;
var cottageObj;
var treeObj;
var earthObj;
var dronePropObj;

//Time variables
var lastUpdateTime;
var deltaT;
var keys = [];

var gameObjects = [];
var lights = {
	'direct': null,
	'point' : [],
	'ambient': null
};
var drone;
var terrain;
var cottage;
var camera;


/**
 * Loads all game assets
 */
async function loadAssets() {
	console.log("Loading assets...");
	await Promise.all([
		utils.load('./static/shaders/vertex.glsl').then(text => vs = text),
		utils.load('./static/shaders/fragment.glsl').then(text => fs = text),
		utils.load('./static/assets/objects/drone_no_prop.obj').then( text => droneObj = text),
		utils.load('./static/assets/objects/prop.obj').then( text => dronePropObj = text),
		utils.load('./static/assets/objects/terrain_scaled.obj').then( text => terrainObj = text),
		utils.load('./static/assets/objects/skyBox.obj').then( text => skyBoxObj = text),
		utils.load('./static/assets/objects/cottage_obj.obj').then( text => cottageObj = text),
		utils.load('./static/assets/objects/tree.obj').then( text => treeObj = text),
		utils.load('./static/assets/objects/world.obj').then( text => worldObj = text),
	]);
	console.log("Done.")
}


/**
 * Sets up canvas and attaches listeners for controls and resize
 */
function setupCanvas() {
// setup everything else
	console.log("Setting up canvas...")
	canvas = document.getElementById("drone-sim-canvas");
	window.addEventListener("keyup", keyFunctionUp, false);
	window.addEventListener("keydown", keyFunctionDown, false);
	window.onresize = doResize;
	canvas.width  = window.innerWidth-16;
	canvas.height = window.innerHeight-200;
	console.log("Done.")
}

/**
 * Resizes canvas height and width on window resize.
 */
function doResize() {
    var canvas = document.getElementById("drone-sim-canvas");
    if((window.innerWidth > 40) && (window.innerHeight > 240)) {
        console.log("Canvas size changed.");
        canvas.width  = window.innerWidth-16;
        canvas.height = window.innerHeight-200;
        var w=canvas.clientWidth;
        var h=canvas.clientHeight;

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.viewport(0.0, 0.0, w, h);

        aspectRatio = w/h;
    }
}

/**
 * Computes delta time
 */
function computeDeltaT(){

	// compute time interval
	var currentTime = (new Date).getTime();
	if(lastUpdateTime) {
		deltaT = (currentTime - lastUpdateTime) / 1000.0;
	} else {
		deltaT = 1/50;
	}
	lastUpdateTime = currentTime;
	return deltaT;
}

function drawBasics(obj){
	// BINDING INPUT VARYINGS, VERTEX, NORMAL, TEXTURE UV, INDICES, TEXTURE ID
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.mesh.vertexBuffer);
	gl.vertexAttribPointer(
		program.vertexPositionAttribute, obj.mesh.vertexBuffer.itemSize,
		gl.FLOAT, false, 0, 0
	);
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.mesh.normalBuffer);
	gl.vertexAttribPointer(
		program.vertexNormalAttribute, obj.mesh.normalBuffer.itemSize,
		gl.FLOAT, false, 0, 0
	);
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.mesh.textureBuffer);
	gl.vertexAttribPointer(
		program.textureCoordAttribute, obj.mesh.textureBuffer.itemSize,
		gl.FLOAT, false, 0, 0
	);
	let textureId = obj.hasTexture ? obj.texture.id : null;
	gl.uniform1i(program.textureUniform, textureId);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.mesh.indexBuffer);
}
/**
 * Draws an object as seen on the camera. If textureOn, it draws the object with its texture.
 * @param {Array} obj
 */
function drawObj(obj) {
	if(!obj.toBeDrawn){
		return 0;
	}else{
		drawBasics(obj);

		// DO CALCULATIONS FOR OBJECT SPACE SHADERS
		let inverseWorldMatrix = utils.invertMatrix(obj.worldMatrix);
		let inverseWVMatrix = utils.invertMatrix(utils.multiplyMatrices(obj.worldMatrix, camera.viewMatrix));
		let WVPmatrix = utils.multiplyMatrices(camera.projectionMatrix, obj.worldMatrix);


		let sub3InvWorldMatrix = utils.sub3x3from4x4(inverseWorldMatrix);
		let transformedLightDir = utils.multiplyMatrix3Vector3(sub3InvWorldMatrix, lights.direct.direction);
		transformedLightDir = utils.normalizeVector3(transformedLightDir);


		// GET ALL THE UNIFORMS
		// EYE Position
		let eyePos = utils.multiplyMatrixVector(inverseWorldMatrix, camera.pos.concat(1));

		gl.uniform3f(program.eyePosition, ...eyePos);

		gl.uniform3f(program.dirLightDirection, ...transformedLightDir);

		if(lights.direct.on){
			gl.uniform4f(program.dirLightColor, ...lights.direct.color);
		} else {
			gl.uniform4f(program.dirLightColor, ...[0,0,0,1]);
		}

		if(lights.ambient.on){
			gl.uniform4f(program.ambientLightColor, ...lights.ambient.color);
		}else{
			gl.uniform4f(program.ambientLightColor, ...[0,0,0,1]);
		}

		gl.uniform1i(program.pointLightsLength, lights.point.length);

		for(let i=0; i<lights.point.length; i++) {
				let lightPos = gl.getUniformLocation(program, "u_point_lights["+i+"].position");

				let transformedLightPos = utils.multiplyMatrixVector(inverseWorldMatrix, lights.point[i].pos.concat(1))
				gl.uniform3f(lightPos, ...transformedLightPos);
				let lightDecay = gl.getUniformLocation(program, "u_point_lights["+i+"].decay");
				gl.uniform1f(lightDecay, lights.point[i].decay);
				let lightColor = gl.getUniformLocation(program, "u_point_lights["+i+"].color");
				if(lights.point[i].on){
						gl.uniform4f(lightColor, ...lights.point[i].color);
				}else{
					gl.uniform4f(lightColor, ...[0,0,0,1]);
				}
				let lightTarget = gl.getUniformLocation(program, "u_point_lights["+i+"].target");
				gl.uniform1f(lightTarget, lights.point[i].target);
		}

		gl.uniformMatrix4fv(program.WVPmatrixUniform, gl.FALSE, utils.transposeMatrix(WVPmatrix));
		// the following is not needed anymore since shaders are in obj space
		//gl.uniformMatrix4fv(program.NmatrixUniform, gl.FALSE, utils.transposeMatrix(obj.worldMatrix));

		// object and material properties
		gl.uniform1f(program.texFactor, obj.texFactor);
		gl.uniform1i(program.hasTexture, obj.hasTexture);
		gl.uniform4f(program.diffuseColor, ...obj.diffuseColor);
		gl.uniform1f(program.specularShine, obj.specularShine);
		gl.uniform4f(program.specularColor, ...obj.specularColor);
		gl.uniform4f(program.emitColor, ...obj.emitColor);
		gl.uniform4f(program.ambientColor, ...obj.ambientColor);

		gl.drawElements(gl.TRIANGLES, obj.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	}
}


/**
 * Draws each animation frame, updates positions and delta time
 * @param {*} camera
 * @param {*} objects
 */
function drawScene() {
	// Compute time interval
	deltaT = computeDeltaT();
	//computing world matrix
	gameObjects.forEach( v => v.update() );
	camera.update();
	gameObjects.forEach( v => drawObj(v));
	window.requestAnimationFrame(drawScene);
}


/**
 * Compiles and links the shaders to the program
 * @param {*} program
 * @param {*} vs
 * @param {*} fs
 */
function compileAndLink(program,vs,fs){
	program = gl.createProgram();
	var v1 = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(v1, vs);
	gl.compileShader(v1);
	if (!gl.getShaderParameter(v1, gl.COMPILE_STATUS)) {
		alert("ERROR IN VS SHADER : " + gl.getShaderInfoLog(v1));
	}
	var v2 = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(v2, fs)
	gl.compileShader(v2);
	if (!gl.getShaderParameter(v2, gl.COMPILE_STATUS)) {
		alert("ERROR IN FS SHADER : " + gl.getShaderInfoLog(v2));
	}
	gl.attachShader(program, v1);
	gl.attachShader(program, v2);
	gl.linkProgram(program);
	return program;
}


/**
 * Extracts and assigns to global program all the shader variables.
 * @param {*} program
 */
function linkMeshAttr(program){
	// Enable and assign to program buffers for vertex position, normals and UV
	// coordinates of texture
	program.vertexPositionAttribute = gl.getAttribLocation(program, "in_pos");
	gl.enableVertexAttribArray(program.vertexPositionAttribute);
	program.vertexNormalAttribute = gl.getAttribLocation(program, "in_norm");
	gl.enableVertexAttribArray(program.vertexNormalAttribute);
	program.textureCoordAttribute = gl.getAttribLocation(program, "in_uv");
	gl.enableVertexAttribArray(program.textureCoordAttribute);

	// Associate uniforms to program
	program.WVPmatrixUniform = gl.getUniformLocation(program, "pMatrix");

	// Texture
	program.textureUniform = gl.getUniformLocation(program, "u_texture");
	program.texFactor = gl.getUniformLocation(program, "u_tex_factor");
	program.hasTexture = gl.getUniformLocation(program, "u_has_texture");

	// Direct light
	program.dirLightDirection = gl.getUniformLocation(program, "u_dir_light.direction");
	program.dirLightColor = gl.getUniformLocation(program, "u_dir_light.color");

	// Point Lights
	program.pointLightsLength = gl.getUniformLocation(program, "u_pl_length");

	// Ambient Light
	program.ambientLightColor = gl.getUniformLocation(program, "u_amb_light");

	// Material
	program.diffuseColor = gl.getUniformLocation(program, "u_mat.diffuse");
	program.emitColor = gl.getUniformLocation(program, "u_mat.emit");
	program.ambientColor = gl.getUniformLocation(program, "u_mat.ambient")
	program.specularColor = gl.getUniformLocation(program, "u_mat.specular");
	program.specularShine = gl.getUniformLocation(program, "u_mat.shine");

	// Camera position
	program.eyePosition = gl.getUniformLocation(program, "u_eye_pos");
	return program;
}


/**
 * Checks collisions of the drone with each object in the array
 * @param {Array} objects
 */
function prepareChunks(objects) {
	chunkMng = new ChunkManager(
		objects.map(v => v.mesh),
		objects.map(v => v.worldMatrix),
		NUMOFCHUNKS
	);
}


/**
 * Initializes global gl program, compiles global fragment and vertex shaders,
 * sets the viewport to the canvas dimensions and enables depth testing.
 */
function initializeWebGL() {
	try {
		gl = canvas.getContext("webgl2");
	} catch(e) {
		console.log(e);
	}

	if(gl) {
		program = compileAndLink(program,vs,fs);
		gl.useProgram(program);

		// Link mesh attributes to shader attributes and enable them
		program = linkMeshAttr(program,false);

		// Init world view and projection matrices
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.viewport(0.0, 0.0, canvas.clientWidth, canvas.clientHeight);
		aspectRatio = canvas.clientWidth/canvas.clientHeight;

		// Turn on depth testing
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
	} else {
		alert("Error: WebGL not supported by your browser!");
	}
}

//----------------------------------------MAIN FUNCTION-----------------------------------------
async function main(){
	setupCanvas();
	// If assets are not ready, the game cannot start.
	await loadAssets();
	initializeWebGL();

	drone = new Drone({
		'pos': [-10.7, -32, 5.61],
		'mesh': new OBJ.Mesh(droneObj),
		'texture': new Texture('static/assets/textures/drone.png'),
		'collisionOn': true,
		'specularColor': [0.3, 0.3, 0.3, 0.0],
		'specularShine': 100,
		'texFactor': 1.0,
		'scale': 2,
		'worldNotScale' : true
	});

	terrain = new WorldObject({
		'mesh': new OBJ.Mesh(terrainObj),
		'texture': new Texture('static/assets/textures/park.jpg'),
		'pos': [-200, -80, 600],
		'rotation': [270, 0, 0],
		'texFactor': 1,
		'specularShine': 20,
		'specularColor': [0.1, 0.1, 0.1, 0.0],
	});

	skyBox = new SkyBox({
		'mesh': new OBJ.Mesh(skyBoxObj),
		'ambientColor': [0.0, 0.0, 0.0, 0.0],
		'emitColor': [0.8, 0.91, 0.976, 1.0],
		'diffuseColor': [0.0, 0.0, 0.0, 0.0],
		'specularColor': [0.0, 0.0, 0.0, 0.0],
		'parent': drone
	});

	cottage = new WorldObject({
		'mesh': new OBJ.Mesh(cottageObj),
		'pos': [-50, -35.5, 2],
		'texture': new Texture('static/assets/textures/cottage_diffuse.png'),
		'specularColor': [1, 1, 1, 0.0],
		'specularShine': 100,
		'texFactor': 1,
		'scale':1
	});

	tree = new WorldObject({
		'mesh': new OBJ.Mesh(treeObj),
		'pos':  [-60.99694085462639, -34.5, 12.507392475504481],
		'texture': new Texture('static/assets/textures/branch.png'),
		'texFactor': 1,
		'scale': 5
	});

	camera = new Camera({
		'target': drone,
		'targetDistance': [0, 1, -2.2, 1],
		'farPlane': 300
	});

	sphere = new WorldObject({
		'pos': [-50, -30, 2],
		'mesh': new OBJ.Mesh(worldObj),
		'specularColor': [1.0, 1.0, 1.0, 0.0],
		'specularShine': 0.8,
		'emitColor': [0.0, 0.0, 1.0, 0.0]
	});

	let dronePropMesh = new OBJ.Mesh(dronePropObj);

	let dronePropR = new Propeller({
		'mesh': dronePropMesh,
		'parent': drone,
		'pos': [-0.255, 0, 0],
		'angVel': -1000,
	});

	let dronePropL = new Propeller({
		'mesh': dronePropMesh,
		'parent': drone,
		'pos': [0.255, 0, 0],
		'angVel': 1000,
	});

	let direct = new DirectionalLight({
		'color': [1.0, 1.0, 1.0, 0.0],
		'direction' : utils.normalizeVector3([0.60, 0.35, 0.70]),
		'on':true
	});

	let pl1 = new PointLight({
		'pos': [-20, -25, 8],
		'decay': 2,
		'target': 10,
		'color': [1.0, 1.0, 1.0, 1.0],
		'on':false
	});

	let pl2 = new PointLight({
		'pos': [-50, 20, -20],
		'decay': 2,
		'target': 10,
		'color': [0.0, 0.0, 1.0, 1.0],
		'on':false
	});


	let pl3 = new PointLight({
		'pos': [-50, -20, 15],
		'decay': 2,
		'target': 10,
		'color': [1.0, 0.0, 0.0, 1.0],
		'on':false
	});

	let ambient = new AmbientLight({
		'color': [0.392, 0.369, 0.306, 1.0],
		'on':true
	});

	gameObjects.push(drone, terrain, skyBox, cottage, tree, dronePropR, dronePropL);

	lights['direct'] = direct;

	console.log(pl1.on);
	lights['point'].push(pl1, pl2, pl3);
	lights['ambient'] = ambient;
	console.log(lights["point"][0].on);
	prepareChunks([terrain,tree]);
	initInput();
	drawScene();
}
