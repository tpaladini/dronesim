var canvas;

var gl = null,
	program = null,
	program1 = null;
	droneMesh = null,
	skybox = null,
	imgtx = null,
	skyboxLattx = null,
	skyboxTbtx = null;
	
var projectionMatrix, 
	perspectiveMatrix,
	viewMatrix,
	worldMatrix,
	gLightDir,
	skyboxWM;


//Parameters for Camera
var cx = 4.5;
var cy = 5.0;
var cz = 10.0;
var elevation = 0.01;
var angle = 0.01;
var roll = 0.01;

var droneAngle = 0;
var droneX = 0;
var droneY = 10;
var droneZ = 0;

var lookRadius = 10.0;


var keys = [];
var vx = 0.0;
var vz = 0.0;
var vy = 0.0;
var rvy = 0.0;

var keyFunctionDown =function(e) {
  if(!keys[e.keyCode]) {
  	keys[e.keyCode] = true;
	switch(e.keyCode) {
	  case 81:
//console.log("KeyUp   - Dir LEFT");
		vx = vx - 1.0;
		break;
	  case 69:
//console.log("KeyUp   - Dir RIGHT");
		vx = vx + 1.0;
		break;
	  case 38:
//console.log("KeyUp   - Dir forward");
		vz = vz - 1.0;
		break;
	  case 40:
//console.log("KeyUp   - Dir back");
		vz = vz + 1.0;
		break;
	  case 87:
//console.log("KeyUp   - Dir UP");
		vy = vy - 1.0;
		break;
	  case 83:
//console.log("KeyUp   - Dir DOWN");
		vy = vy + 1.0;
		break;
	  case 39:
//console.log("KeyUp   - Dir rotation LEFT");
		rvy = rvy - 1.0;
		break;
	  case 37:
//console.log("KeyUp   - Dir rotation RIGHT");
		rvy = rvy + 1.0;
		break;
	}
  }
}

var keyFunctionUp =function(e) {
  if(keys[e.keyCode]) {
  	keys[e.keyCode] = false;
	switch(e.keyCode) {
	  case 81:
//console.log("KeyDown  - Dir LEFT");
		vx = vx + 1.0;
		break;
	  case 69:
//console.log("KeyDown - Dir RIGHT");
		vx = vx - 1.0;
		break;
	  case 38:
//console.log("KeyDown - Dir forward");
		vz = vz + 1.0;
		break;
	  case 40:
//console.log("KeyDown - Dir back");
		vz = vz - 1.0;
		break;
	  case 87:
//console.log("KeyUp   - Dir UP");
		vy = vy + 1.0;
		break;
	  case 83:
//console.log("KeyUp   - Dir DOWN");
		vy = vy - 1.0;
		break;
	  case 39:
//console.log("KeyDown  - Dir rotation LEFT");
		rvy = rvy + 1.0;
		break;
	  case 37:
//console.log("KeyDown - Dir rotation RIGHT");
		rvy = rvy - 1.0;
		break;
	}
  }
}

var aspectRatio;

function doResize() {
    // set canvas dimensions
	var canvas = document.getElementById("my-canvas");
    if((window.innerWidth > 40) && (window.innerHeight > 240)) {
		canvas.width  = window.innerWidth-16;
		canvas.height = window.innerHeight-200;
		var w=canvas.clientWidth;
		var h=canvas.clientHeight;
		
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.viewport(0.0, 0.0, w, h);
		
		aspectRatio = w/h;
    }
}

		
// Vertex shader
var vs = `#version 300 es
#define POSITION_LOCATION 0
#define NORMAL_LOCATION 1
#define UV_LOCATION 2

layout(location = POSITION_LOCATION) in vec3 in_pos;
layout(location = NORMAL_LOCATION) in vec3 in_norm;


uniform mat4 pMatrix;
uniform mat4 nMatrix;

out vec3 fs_pos;
out vec3 fs_norm;


void main() {
	fs_pos = in_pos;
	fs_norm = (nMatrix * vec4(in_norm, 0.0)).xyz;

	
	gl_Position = pMatrix * vec4(in_pos, 1.0);
}`;

// Fragment shader
var fs = `#version 300 es
precision highp float;

in vec3 fs_pos;
in vec3 fs_norm;



uniform vec4 lightDir;
//uniform float ambFact;

out vec4 color;

void main() {

	float ambFact = lightDir.w;
	float dimFact = (1.0-ambFact) * clamp(dot(normalize(fs_norm), lightDir.xyz),0.0,1.0) + ambFact;
	color = vec4(dimFact,dimFact,dimFact, 1);
}`;

// Vertex shader
var vs1 = `#version 300 es
#define POSITION_LOCATION 0
#define NORMAL_LOCATION 1
#define UV_LOCATION 2

layout(location = POSITION_LOCATION) in vec3 in_pos;
layout(location = NORMAL_LOCATION) in vec3 in_norm;
layout(location = UV_LOCATION) in vec2 in_uv;

uniform mat4 pMatrix;
uniform mat4 nMatrix;

out vec3 fs_pos;
out vec3 fs_norm;
out vec2 fs_uv;

void main() {
	fs_pos = in_pos;
	fs_norm = (nMatrix * vec4(in_norm, 0.0)).xyz;
	fs_uv = vec2(in_uv.x, 1.0-in_uv.y);
	
	gl_Position = pMatrix * vec4(in_pos, 1.0);
}`;

// Fragment shader
var fs1 = `#version 300 es
precision highp float;

in vec3 fs_pos;
in vec3 fs_norm;
in vec2 fs_uv;

uniform sampler2D u_texture;
uniform vec4 lightDir;
//uniform float ambFact;

out vec4 color;

void main() {
	vec4 texcol = texture(u_texture, fs_uv);
	float ambFact = lightDir.w;
	float dimFact = (1.0-ambFact) * clamp(dot(normalize(fs_norm), lightDir.xyz),0.0,1.0) + ambFact;
	color = vec4(texcol.rgb * dimFact, texcol.a);
}`;

// event handler

var mouseState = false;
var lastMouseX = -100, lastMouseY = -100;
function doMouseDown(event) {
	lastMouseX = event.pageX;
	lastMouseY = event.pageY;
	mouseState = true;
}
function doMouseUp(event) {
	lastMouseX = -100;
	lastMouseY = -100;
	mouseState = false;
}
function doMouseMove(event) {
	if(mouseState) {
		var dx = event.pageX - lastMouseX;
		var dy = lastMouseY - event.pageY;
		lastMouseX = event.pageX;
		lastMouseY = event.pageY;
		
		if((dx != 0) || (dy != 0)) {
			angle = angle + 0.5 * dx;
			elevation = elevation + 0.5 * dy;
		}
	}
}
function doMouseWheel(event) {
	var nLookRadius = lookRadius + event.wheelDelta/1000.0;
	if((nLookRadius > 2.0) && (nLookRadius < 20.0)) {
		lookRadius = nLookRadius;
	}
}

// texture loader callback
var textureLoaderCallback = function() {
	var textureId = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0 + this.txNum);
	gl.bindTexture(gl.TEXTURE_2D, textureId);		
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this);		
// set the filtering so we don't need mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
}

// The real app starts here
function main(){
	
	// setup everything else
	var canvas = document.getElementById("my-canvas");
	canvas.addEventListener("mousedown", doMouseDown, false);
	canvas.addEventListener("mouseup", doMouseUp, false);
	canvas.addEventListener("mousemove", doMouseMove, false);
	canvas.addEventListener("mousewheel", doMouseWheel, false);
	window.addEventListener("keyup", keyFunctionUp, false);
	window.addEventListener("keydown", keyFunctionDown, false);
	window.onresize = doResize;
	canvas.width  = window.innerWidth-16;
	canvas.height = window.innerHeight-200;
	
	try{
		gl= canvas.getContext("webgl2");
	} catch(e){
		console.log(e);
	}
	
	if(gl){
		// Compile and link shaders
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
		
		/*
		program1 = gl.createProgram();
		var v11 = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(v11, vs1);
		gl.compileShader(v11);
		if (!gl.getShaderParameter(v11, gl.COMPILE_STATUS)) {
			alert("ERROR IN VS SHADER : " + gl.getShaderInfoLog(v11));
		}
		var v12 = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(v12, fs1)
		gl.compileShader(v12);		
		if (!gl.getShaderParameter(v12, gl.COMPILE_STATUS)) {
			alert("ERROR IN FS SHADER : " + gl.getShaderInfoLog(v12));
		}			
		gl.attachShader(program1, v11);
		gl.attachShader(program1, v12);
		gl.linkProgram(program1);	*/			
		
		gl.useProgram(program);

		// Load mesh using the webgl-obj-loader libraryvar

		droneMesh = new OBJ.Mesh(droneObjStr);
		terrainMesh = new OBJ.Mesh(terrainObjStr);
		//skybox = new OBJ.Mesh(trackNfieldObjStr);
		
		// Create the textures
		/*imgtx = new Image();
		imgtx.txNum = 0;
		imgtx.onload = textureLoaderCallback;
		imgtx.src = droneTextureData;

		skyboxLattx = new Image();
		skyboxLattx.txNum = 1;
		skyboxLattx.onload = textureLoaderCallback;
		skyboxLattx.src = TrackTextureData;*/

		/*skyboxTbtx = new Image();
		skyboxTbtx.txNum = 2;
		skyboxTbtx.onload = textureLoaderCallback;
		skyboxTbtx.src = FieldTextureData;*/
		
		// links mesh attributes to shader attributes
		program.vertexPositionAttribute = gl.getAttribLocation(program, "in_pos");
		gl.enableVertexAttribArray(program.vertexPositionAttribute);
		 
		program.vertexNormalAttribute = gl.getAttribLocation(program, "in_norm");
		gl.enableVertexAttribArray(program.vertexNormalAttribute);
		 
		/*program.textureCoordAttribute = gl.getAttribLocation(program, "in_uv");
		gl.enableVertexAttribArray(program.textureCoordAttribute);*/

		program.WVPmatrixUniform = gl.getUniformLocation(program, "pMatrix");
		program.NmatrixUniform = gl.getUniformLocation(program, "nMatrix");
		/*program.textureUniform = gl.getUniformLocation(program, "u_texture");*/
		program.lightDir = gl.getUniformLocation(program, "lightDir");
	    //program.ambFact = gl.getUniformLocation(program, "ambFact");

		/*
		// links mesh attributes to shader attributes
		program1.vertexPositionAttribute = gl.getAttribLocation(program1, "in_pos");
		gl.enableVertexAttribArray(program1.vertexPositionAttribute);
		 
		program1.vertexNormalAttribute = gl.getAttribLocation(program1, "in_norm");
		gl.enableVertexAttribArray(program1.vertexNormalAttribute);
		 
		program1.textureCoordAttribute = gl.getAttribLocation(program1, "in_uv");
		gl.enableVertexAttribArray(program1.textureCoordAttribute);

		program1.WVPmatrixUniform = gl.getUniformLocation(program1, "pMatrix");
		program1.NmatrixUniform = gl.getUniformLocation(program1, "nMatrix");
		program1.textureUniform = gl.getUniformLocation(program1, "u_texture");
		program1.lightDir = gl.getUniformLocation(program1, "lightDir");
  		program1.ambFact = gl.getUniformLocation(program1, "ambFact");*/
		
		OBJ.initMeshBuffers(gl, droneMesh);
		OBJ.initMeshBuffers(gl, terrainMesh);
		
		// prepares the world, view and projection matrices.
		var w=canvas.clientWidth;
		var h=canvas.clientHeight;
		
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.viewport(0.0, 0.0, w, h);
		
//		perspectiveMatrix = utils.MakePerspective(60, w/h, 0.1, 1000.0);
		aspectRatio = w/h;
		
	 // turn on depth testing
	    gl.enable(gl.DEPTH_TEST);
	
	
		// algin the skybox with the light
		gLightDir = [-1.0, 0.0, 0.0, 0.0];
		skyboxWM = utils.multiplyMatrices(utils.MakeRotateZMatrix(30), utils.MakeRotateYMatrix(135));
		gLightDir = utils.multiplyMatrixVector(skyboxWM, gLightDir);
	
		drawScene();
	}else{
		alert("Error: WebGL not supported by your browser!");
	}
}

var lastUpdateTime;
var camVel = [0,0,0];
var fSk = 500.0;
var fDk = 2.0 * Math.sqrt(fSk);

// Driving dynamic coefficients
var sAT = 0.5;
var mAT = 5.0;
var ATur = 3.0;
var ATdr = 5.5;
var sBT = 1.0;
var mBT = 3.0;
var BTur = 5.0;
var BTdr = 5.5;
var Tfric = Math.log(0.05);
var sAS = 0.1;	// Not used yet
var mAS = 108.0;
var ASur = 1.0;	// Not used yet
var ASdr = 0.5;	// Not used yet

var droneLinAccz = 0.0;
var droneLinVelz = 0.0;
var droneLinAccy = 0.0;
var droneLinVely = 0.0;
var droneLinAccx = 0.0;
var droneLinVelx = 0.0;
var preVz = 0;
var preVy = 0;
var preVx = 0;
var droneAngVel = 0.0;

function drawScene() {
		// compute time interval
		var currentTime = (new Date).getTime();
		var deltaT;
		if(lastUpdateTime){
			deltaT = (currentTime - lastUpdateTime) / 1000.0;
		} else {
			deltaT = 1/50;
		}
		lastUpdateTime = currentTime;

		var dronedir2=droneAngle*Math.PI/180;
	
		//WORLD MATRIX
		
		//translation of (droneX,droneY,droneZ)
		var C = [1,0,0,droneX,
				 0,1,0,droneY,
				 0,0,1,droneZ,
				 0,0,0,1];
		//rotation of droneAngle around the y axis
		var D = [Math.cos(dronedir2),	0,	Math.sin(dronedir2),	0,
				 0,					1,	0,					0,
				 -Math.sin(dronedir2),0,	Math.cos(dronedir2),	0,
				 0,					0,	0,					1];
		//computing world matrix
		var dvecmat = utils.multiplyMatrices(C,D);
		
		//VIEW MATRIX
		
		//LookAt camera procedure:
		var Vz = utils.normalizeVector3([cx-droneX, cy-droneY, cz-droneZ]);
		var u=[0,1,0];			//up vector		
		var Vx=utils.normalizeVector3(utils.crossVector(utils.normalizeVector3(u),Vz));
		var Vy=utils.crossVector(Vz,Vx);	
		var viewMatrix = [Vx[0], Vx[1], Vx[2], 0.0,
				   Vy[0], Vy[1], Vy[2], 0.0, 
				   Vz[0], Vz[1], Vz[2], 0.0,
					0.0,   0.0,   0.0,  1.0 ];
		var nc = utils.multiplyMatrixVector(viewMatrix, [cx, cy, cz, 0.0]);
		viewMatrix[3]  = -nc[0];
		viewMatrix[7]  = -nc[1];
		viewMatrix[11] = -nc[2];
			
		//PROJECTION MATRIX
		
		var perspectiveMatrix = [1/aspectRatio/Math.tan(Math.PI/6), 0.0,					0.0,				0.0,
						  0.0,								 1/Math.tan(Math.PI/6),	0.0,				0.0,
						  0.0,								 0.0,					100.1/(0.1-100),	20/(0.1-100),
						  0.0,								 0.0,					-1,					0];

		//VELOCITY Z
		
		vz = -vz;
		// = 0.8 * deltaT * 60 * vz;
		if(vz > 0.1) {
		  if(preVz > 0.1) {
			droneLinAccz = droneLinAccz + ATur * deltaT;
			if(droneLinAccz > mAT) droneLinAccz = mAT;
		  } else if(droneLinAccz < sAT) droneLinAccz = sAT;
		} else if(vz > -0.1) {
			droneLinAccz = droneLinAccz - ATdr * deltaT * Math.sign(droneLinAccz);
			if(Math.abs(droneLinAccz) < 0.001) droneLinAccz = 0.0;
		} else { 
		  if(preVz < 0.1) {
			droneLinAccz = droneLinAccz - BTur * deltaT;
			if(droneLinAccz < -mBT) droneLinAccz = -mBT;
		  } else if(droneLinAccz > -sBT) droneLinAccz = -sBT;
		}
		preVz = vz;
		vz = -vz;
		droneLinVelz = droneLinVelz * Math.exp(Tfric * deltaT) - deltaT * droneLinAccz;
		
		//VELOCITY Y
		
		vy = -vy;
		// = 0.8 * deltaT * 60 * vy;
		if(vy > 0.1) {
		  if(preVy > 0.1) {
			droneLinAccy = droneLinAccy + ATur * deltaT;
			if(droneLinAccy > mAT) droneLinAccy = mAT;
		  } else if(droneLinAccy < sAT) droneLinAccy = sAT;
		} else if(vy > -0.1) {
			droneLinAccy = droneLinAccy - ATdr * deltaT * Math.sign(droneLinAccy);
			if(Math.abs(droneLinAccy) < 0.001) droneLinAccy = 0.0;
		} else { 
		  if(preVy < 0.1) {
			droneLinAccy = droneLinAccy - BTur * deltaT;
			if(droneLinAccy < -mBT) droneLinAccy = -mBT;
		  } else if(droneLinAccy > -sBT) droneLinAccy = -sBT;
		}
		preVy = vy;
		vy = -vy;
		droneLinVely = droneLinVely * Math.exp(Tfric * deltaT) - deltaT * droneLinAccy;
		
		//VELOCITY X
		
		vx = -vx;
		// = 0.8 * deltaT * 60 * vx;
		if(vx > 0.1) {
		  if(preVx > 0.1) {
			droneLinAccx = droneLinAccx + ATur * deltaT;
			if(droneLinAccx > mAT) droneLinAccx = mAT;
		  } else if(droneLinAccx < sAT) droneLinAccx = sAT;
		} else if(vx > -0.1) {
			droneLinAccx = droneLinAccx - ATdr * deltaT * Math.sign(droneLinAccx);
			if(Math.abs(droneLinAccx) < 0.001) droneLinAccx = 0.0;
		} else { 
		  if(preVx < 0.1) {
			droneLinAccx = droneLinAccx - BTur * deltaT;
			if(droneLinAccx < -mBT) droneLinAccx = -mBT;
		  } else if(droneLinAccx > -sBT) droneLinAccx = -sBT;
		}
		preVx = vx;
		vx = -vx;
		droneLinVelx = droneLinVelx * Math.exp(Tfric * deltaT) - deltaT * droneLinAccx;
		
		
		// Magic for moving the drone
		worldMatrix = utils.multiplyMatrices(dvecmat, utils.MakeScaleMatrix(1.0));
		xaxis = [dvecmat[0],dvecmat[4],dvecmat[8]];
		yaxis = [dvecmat[1],dvecmat[5],dvecmat[9]];
		zaxis = [dvecmat[2],dvecmat[6],dvecmat[10]];
		
		// computing drone velocities
		droneAngVel = mAS * deltaT * rvy;
		
		if(rvy != 0) {
			qy = Quaternion.fromAxisAngle(yaxis, utils.degToRad(droneAngVel));
			newDvecmat = utils.multiplyMatrices(qy.toMatrix4(), dvecmat);
			R11=newDvecmat[10];R12=newDvecmat[8];R13=newDvecmat[9];
			R21=newDvecmat[2]; R22=newDvecmat[0];R23=newDvecmat[1];
			R31=newDvecmat[6]; R32=newDvecmat[4];R33=newDvecmat[5];
			
			if((R31<1)&&(R31>-1)) {
				theta = -Math.asin(R31);
				phi = Math.atan2(R32/Math.cos(theta), R33/Math.cos(theta));
				psi = Math.atan2(R21/Math.cos(theta), R11/Math.cos(theta));
				
			} else {
				phi = 0;
				if(R31<=-1) {
					theta = Math.PI / 2;
					psi = phi + Math.atan2(R12, R13);
				} else {
					theta = -Math.PI / 2;
					psi = Math.atan2(-R12, -R13) - phi;
				}
			}
//			elevation = theta/Math.PI*180;
//			roll      = phi/Math.PI*180;
//			angle     = psi/Math.PI*180;
			droneAngle  = psi/Math.PI*180;
		}
		// spring-camera system
			// target coordinates
		nC = utils.multiplyMatrixVector(worldMatrix, [0, 5, -10, 1]);
			// distance from target
			
		deltaCam = [cx - nC[0], cy - nC[1], cz - nC[2]];
		
		camAcc = [-fSk * deltaCam[0] - fDk * camVel[0], -fSk * deltaCam[1] - fDk * camVel[1], -fSk * deltaCam[2] - fDk * camVel[2]];
		
		camVel = [camVel[0] + camAcc[0] * deltaT, camVel[1] + camAcc[1] * deltaT, camVel[2] + camAcc[2] * deltaT];
		cx += camVel[0] * deltaT;
		cy += camVel[1] * deltaT;
		cz += camVel[2] * deltaT;
		
		// drone motion
		delta = utils.multiplyMatrixVector(dvecmat, [droneLinVelx, droneLinVely, droneLinVelz, 0.0]);
		droneX -= delta[0];
		droneY -= delta[1];
		droneZ -= delta[2];



		projectionMatrix = utils.multiplyMatrices(perspectiveMatrix, viewMatrix);		
		gl.useProgram(program);
		// draws the request
		gl.bindBuffer(gl.ARRAY_BUFFER, droneMesh.vertexBuffer);
		gl.vertexAttribPointer(program.vertexPositionAttribute, droneMesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
	    /*gl.bindBuffer(gl.ARRAY_BUFFER, droneMesh.textureBuffer);
	    gl.vertexAttribPointer(program.textureCoordAttribute, droneMesh.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);*/
		
		gl.bindBuffer(gl.ARRAY_BUFFER, droneMesh.normalBuffer);
		gl.vertexAttribPointer(program.vertexNormalAttribute, droneMesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
		 
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, droneMesh.indexBuffer);		

		/*gl.uniform1i(program.textureUniform, 0);*/
		gl.uniform4f(program.lightDir, gLightDir[0], gLightDir[1], gLightDir[2], 0.2);
		WVPmatrix = utils.multiplyMatrices(projectionMatrix, worldMatrix);
		gl.uniformMatrix4fv(program.WVPmatrixUniform, gl.FALSE, utils.transposeMatrix(WVPmatrix));		
		gl.uniformMatrix4fv(program.NmatrixUniform, gl.FALSE, utils.transposeMatrix(worldMatrix));
		gl.drawElements(gl.TRIANGLES, droneMesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		
		// draws the terrain
		gl.bindBuffer(gl.ARRAY_BUFFER, terrainMesh.vertexBuffer);
		gl.vertexAttribPointer(program.vertexPositionAttribute, terrainMesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
	    //gl.bindBuffer(gl.ARRAY_BUFFER, droneMesh.textureBuffer);
	    //gl.vertexAttribPointer(program.textureCoordAttribute, droneMesh.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, terrainMesh.normalBuffer);
		gl.vertexAttribPointer(program.vertexNormalAttribute, terrainMesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
		 
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainMesh.indexBuffer);		

		//gl.uniform1i(program.textureUniform, 0);
		gl.uniform4f(program.lightDir, gLightDir[0], gLightDir[1], gLightDir[2], 0.2);
		worldMatrix=utils.multiplyMatrices(utils.multiplyMatrices(utils.MakeRotateXMatrix(270),[1,0,0,0,0,1,0,-200,0,0,1,0,0,0,0,1]),utils.MakeScaleMatrix(20));
		WVPmatrix = utils.multiplyMatrices(projectionMatrix, worldMatrix);
		gl.uniformMatrix4fv(program.WVPmatrixUniform, gl.FALSE, utils.transposeMatrix(WVPmatrix));		
		gl.uniformMatrix4fv(program.NmatrixUniform, gl.FALSE, utils.transposeMatrix(worldMatrix));
		gl.drawElements(gl.TRIANGLES, terrainMesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		
		/*gl.useProgram(program1);
		// draws the skybox
		gl.bindBuffer(gl.ARRAY_BUFFER, terrainMesh.vertexBuffer);
		gl.vertexAttribPointer(program1.vertexPositionAttribute, terrainMesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
	    gl.bindBuffer(gl.ARRAY_BUFFER, terrainMesh.textureBuffer);
	    gl.vertexAttribPointer(program1.textureCoordAttribute, terrainMesh.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, terrainMesh.normalBuffer);
		gl.vertexAttribPointer(program1.vertexNormalAttribute, terrainMesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

		gl.uniform4f(program1.lightDir, gLightDir[0], gLightDir[1], gLightDir[2], 1.0);
		 
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainMesh.indexBuffer);		
		//worldMatrix=utils.multiplyMatrices(utils.multiplyMatrices(utils.MakeRotateXMatrix(270),[1,0,0,0,0,1,0,-200,0,0,1,0,0,0,0,1]),utils.MakeScaleMatrix(20));
		worldMatrix=utils.multiplyMatrices([1,0,0,0,0,1,0,-10,0,0,1,0,0,0,0,1],utils.MakeScaleMatrix(20));
		WVPmatrix = utils.multiplyMatrices(projectionMatrix, worldMatrix);
		gl.uniformMatrix4fv(program1.NmatrixUniform, gl.FALSE, utils.identityMatrix());
		gl.uniform1i(program1.textureUniform, 2);
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 12);
		//gl.uniform1i(program.textureUniform, 1);
		//gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);*/
		
		window.requestAnimationFrame(drawScene);		
}