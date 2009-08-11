o3djs.require('o3djs.util');
o3djs.require('o3djs.math');
o3djs.require('o3djs.quaternions');
o3djs.require('o3djs.rendergraph');
o3djs.require('o3djs.pack');
o3djs.require('o3djs.arcball');
o3djs.require('o3djs.scene');
o3djs.require('o3djs.picking');
o3djs.require('o3djs.primitives');
o3djs.require('o3djs.effect');
o3djs.require('o3djs.loader');

// global o3d variables
var g_root = [];
var g_o3d;
var g_math;
var g_quaternions;
var g_client;
var g_aball;
var g_thisRot;
var g_lastRot;
var g_pack = null;
var g_mainPack;
var g_viewInfo;
var g_lightPosParam;
var g_loadingElement;
var g_o3dWidth = -1;
var g_o3dHeight = -1;
var g_o3dElement;
var g_finished = false;	// for selenium
var g_treeInfo;		// information about the transform graph.
var g_camera = {
  farPlane: 5000,
  nearPlane:0.1
};
var g_dragging = false;

var g_hudRoot;
var g_hudViewInfo;
var g_materialUrls = [
  'shaders/texture-colormult.shader',    // 0
  'shaders/phong-with-colormult.shader'  // 1
];


var g_planeShape;

var g_textureUrls = [
  'openhumanlogo.png'   // 0
  ]
var g_materials =[];	//To store manually loaded materials, used for HUD etc.
var g_textures  =[];	//To store manually loaded textures
//global oH variables
var oH_obj;
var oH_numObj;
var oH_OBJECTS_LIST;
var oH_ASSET_PATH;
var oH_loadingFirstFile=true;	
var oH_Overlay;
var oH_Logo;

var removedObjects = [];

var flashing;
var flashTimer = 0;
var flashShape;

var flashDURATION = 3000;
var flashINTERVAL = 500;
var flashCounter  = 0;

var flashMode = -1;
var flashOrigColor;
var flashedThisInterval;

var g_highlightShape;
var origMaterial;

var flashType	= "COLOR";	//Change this to "MESH" if you want mesh highlighting
							//"COLOR" for color highlighting
var highlightMeshTransform;

/**
 * Creates the client area.
 */
function init()
{
	o3djs.util.makeClients(initStep2,"LargeGeometry");
}

/**
 * Initializes O3D and loads the scene into the transform graph.
 * @param {Array} clientElements Array of o3d object elements.
 */
function initStep2(clientElements)
{
	
	oH_numObj =0;
	oH_ASSET_PATH = "assets/oH/"
	oH_OBJECTS_LIST = new Array  (
		"skull.o3dtgz",
		"head.o3dtgz",
		"eye.o3dtgz",
		"mandible.o3dtgz",
		"thalamus.o3dtgz",
		"cerebralcortex.o3dtgz",
		"cerebellum.o3dtgz",
		"corpuscallosum.o3dtgz",
		"medulla_oblongata.o3dtgz",
		"pituitary.o3dtgz",
		"pons.o3dtgz",
		"hypothalamus.o3dtgz"
	);


	//g_loadingElement = document.getElementById('loading');
	
	g_o3dElement = clientElements[0];
	g_o3d = g_o3dElement.o3d;
	g_math = o3djs.math;
	g_quaternions = o3djs.quaternions;
	g_client = g_o3dElement.client;

	g_mainPack = g_client.createPack();


	// Create the render graph for a view.
	g_viewInfo = o3djs.rendergraph.createBasicView(
		g_mainPack,
		g_client.root,
		g_client.renderGraphRoot,
		[1,1,1,1]
	);

	g_lastRot = g_math.matrix4.identity();
	g_thisRot = g_math.matrix4.identity();

	var root = g_client.root;

	g_aball = o3djs.arcball.create(100, 100);
	setClientSize();

	// Set the light at the same position as the camera to create a headlight
	// that illuminates the object straight on.
	var paramObject = g_mainPack.createObject('ParamObject');
	g_lightPosParam = paramObject.createParam('lightWorldPos', 'ParamFloat3');
	g_camera.target = [0, 0, 0];
	g_camera.eye = [0, 0, 5];
	updateCamera();

	doload();

	o3djs.event.addEventListener(g_o3dElement, 'mousedown', startDragging);
	o3djs.event.addEventListener(g_o3dElement, 'mousemove', drag);
	o3djs.event.addEventListener(g_o3dElement, 'mouseup', stopDragging);
	o3djs.event.addEventListener(g_o3dElement, 'wheel', scrollMe);
	o3djs.event.addEventListener(g_o3dElement, 'keypress', buttonRotate);
  
	g_client.setRenderCallback(onRender); 
	flashing = false;
	flashOrigColor = null;
	flashObject = null;
	
	
   	 // Create a material for highlighting.
  	 g_highlightMaterial = g_pack.createObject('Material');
  	 g_highlightMaterial.drawList = g_viewInfo.performanceDrawList;
	 
 	 var effect = g_pack.createObject('Effect');
 	 o3djs.effect.loadEffect(effect, 'shaders/solid-color.shader');
 	 g_highlightMaterial.effect = effect;
	 
 	 effect.createUniformParameters(g_highlightMaterial);
	 
 	 // Setup a state to bring the lines forward.
 	 var state = g_pack.createObject('State');
 	 state.getStateParam('PolygonOffset2').value = -1.0;
 	 state.getStateParam('FillMode').value = g_o3d.State.WIREFRAME;
	 g_highlightMaterial.state = state;
	 origMaterial = new Array();
	 g_highlightShape = null;
	 
	 
	 /*************HUD IMPLEMENTATION**************************/
	 
	 //Create root transform for HUD
	 g_hudRoot = g_pack.createObject('Transform');
	 
	 // Create a second view for the hud. 
  	g_hudViewInfo = o3djs.rendergraph.createBasicView(
        g_pack,
        g_hudRoot,
        g_client.renderGraphRoot);
 
 	 // Make sure the hud gets drawn after the 3d stuff
 	 g_hudViewInfo.root.priority = g_viewInfo.root.priority + 1;
 
	  // Turn off clearing the color for the hud since that would erase the 3d
	  // parts but leave clearing the depth and stencil so the HUD is unaffected
	  // by anything done by the 3d parts.
 	 g_hudViewInfo.clearBuffer.clearColorFlag = false;
 
 	 // Set culling to none so we can flip images using rotation or negative scale.
 	 g_hudViewInfo.zOrderedState.getStateParam('CullMode').value = g_o3d.State.CULL_NONE;
 	 g_hudViewInfo.zOrderedState.getStateParam('ZWriteEnable').value = false;
 
	  // Create an orthographic matrix for 2d stuff in the HUD.
 	 // We assume the area is 800 pixels by 600 pixels and therefore we can
 	 // position things using a 0-799, 0-599 coordinate system. If we change the
 	 // size of the client area everything will get scaled to fix but we don't
 	 // have to change any of our code. See 2d.html
	/* 	
	 g_hudViewInfo.drawContext.projection = g_math.matrix4.orthographic(
 	     0 + 0.5,
 	     g_client.width  + 0.5,
 	     g_client.height + 0.5,
 	     0 + 0.5,
 	     0.001,
 	     1000
	 );
 
 	 g_hudViewInfo.drawContext.view = g_math.matrix4.lookAt(
  	    [0, 0, 1],   // eye
  	    [0, 0, 0],   // target
  	    [0, 1, 0]);  // up
	 */
	  
	  g_hudViewInfo.drawContext.projection = g_math.matrix4.orthographic(
	      -g_client.width * 0.5 + 0.5,
	       g_client.width * 0.5 + 0.5,
	       g_client.height * 0.5 + 0.5,
	      -g_client.height * 0.5 + 0.5,
	       0.001,
	       1000);
	
         g_hudViewInfo.drawContext.view = g_math.matrix4.lookAt(
      		[0, 0, 1],  // eye
      		[0, 0, 0],  // target
      		[0, 1, 0]); // up
	

	 //Setup the materials for the HUD. Unlike the models this must be done manually
	 //For now we have just one material. We may later have to add more.
	 for (var ii = 0; ii < g_materialUrls.length; ++ii)
	 {
   		 var effect = g_pack.createObject('Effect');
   		 o3djs.effect.loadEffect(effect, g_materialUrls[ii]);
 
 		   // Create a Material for the effect.
 		   var material = g_pack.createObject('Material');
 
 		   // Apply our effect to this material.
 		   material.effect = effect;
 
 		   // Create the params the effect needs on the material.
 		   effect.createUniformParameters(material);
 
		    // Set the default params. We'll override these with params on transforms.
		    material.getParam('colorMult').value = [1, 1, 1, 1];
 
  			g_materials[ii] = material;
 	 }
	  g_materials[0].drawList = g_hudViewInfo.zOrderedDrawList;
	 // Create a 2d plane for images. createPlane makes an XZ plane by default
  	// so we pass in matrix to rotate it to an XY plane. We could do
  	// all our manipluations in XZ but most people seem to like XY for 2D.
  		g_planeShape = o3djs.primitives.createPlane(
  					    g_pack,
   					    g_materials[0],
   					    1,
   					    1,
   					    1,
   					    1,
  					    [[1, 0, 0, 0],
  					    [0, 0, 1, 0],
   					    [0,-1, 0, 0],
  					    [0, 0, 0, 1]]);
					
	 // Load all the textures.
     var loader = o3djs.loader.createLoader(initStep3);
 	 for (var ii = 0; ii < g_textureUrls.length; ++ii) {
     loadTexture(loader, g_textureUrls[ii], ii);
     }
     loader.finish();
}

function initStep3(){
	// Setup the hud images.
	oH_Logo = new Image(g_textures[0], true);
	oH_Logo.transform.translate(3, 1, -2);
}

function loadTexture(loader, url, index) {
  loader.loadTexture(g_pack, url, function(texture, exception) {
    if (exception) {
      alert(exception);
    } else {
      g_textures[index] = texture;
    }
  });
}


function Image(texture, opt_topLeft) {
  // create a transform for positioning
  this.transform = g_pack.createObject('Transform');
  this.transform.parent = g_hudRoot;
 
  // create a transform for scaling to the size of the image just so
  // we don't have to manage that manually in the transform above.
  this.scaleTransform = g_pack.createObject('Transform');
  this.scaleTransform.parent = this.transform;
 
  // setup the sampler for the texture
  this.sampler = g_pack.createObject('Sampler');
  this.sampler.addressModeU = g_o3d.Sampler.CLAMP;
  this.sampler.addressModeV = g_o3d.Sampler.CLAMP;
  this.paramSampler = this.scaleTransform.createParam('texSampler0',
                                                      'ParamSampler');
  this.paramSampler.value = this.sampler;
 
  // Setup our UV offsets and color multiplier
  this.paramColorMult = this.scaleTransform.createParam('colorMult',
                                                        'ParamFloat4');
 
  this.setColor(1, 1, 1, 1);
 
  this.sampler.texture = texture;
  this.scaleTransform.addShape(g_planeShape);
  if (opt_topLeft) {
    this.scaleTransform.translate(texture.width / 2, texture.height / 2, 0);
  }
  this.scaleTransform.scale(texture.width, -texture.height, 1);
}

/**
 * Sets the color multiplier for the image.
 * @param {number} r Red component.
 * @param {number} g Green component.
 * @param {number} b Blue component.
 * @param {number} a Alpha component.
 */
Image.prototype.setColor = function(r, g, b, a) {
  this.paramColorMult.set(r, g, b, a);
};

function doload()
{

	if (g_pack)
	{
		g_pack.destroy();
		g_pack = null;
		oH_obj = null;
		
	}
	
	oH_numObj = 0;
	oH_obj = new Array();
	for (i = 0; i < oH_OBJECTS_LIST.length; i++) 
	{
		oH_obj[oH_numObj] = loadFile(g_viewInfo.drawContext, oH_ASSET_PATH + oH_OBJECTS_LIST[i] );
		oH_numObj++;
	}
	g_root=oH_obj;
}

function loadFile(context, path)
{
	function callback(pack, parent, exception)
	{
		//enableInput(true);
		if (exception)
		{
			alert("Could not load: " + path + "\n" + exception);
		//	g_loadingElement.innerHTML = "loading failed.";
		}
		else
		{
		//	g_loadingElement.innerHTML = "loading finished.";

			// Generate draw elements and setup material draw lists.
			o3djs.pack.preparePack(pack, g_viewInfo);

			var bbox = o3djs.util.getBoundingBoxOfTree(g_client.root);

			g_camera.target = g_math.lerpVector(bbox.minExtent, bbox.maxExtent, 0.5);

			var diag = g_math.length(g_math.subVector(bbox.maxExtent,bbox.minExtent));

			g_camera.eye = g_math.addVector(g_camera.target, [0, 0, 1.0 * diag]);
			g_camera.nearPlane = diag / 1000;
			g_camera.farPlane = diag * 10;
			setClientSize();
			updateCamera();
			updateProjection();

			// Manually connect all the materials' lightWorldPos params to the context
			var materials = pack.getObjectsByClassName('o3d.Material');
			for (var m = 0; m < materials.length; ++m)
			{
				var material = materials[m];
				var param = material.getParam('lightWorldPos');
				if (param)
				{
					param.bind(g_lightPosParam);
				}
				
				
				var effect = material.effect;  				
  				effect.createUniformParameters(material);
				
				
			}

			g_finished = true;  // for selenium

			// Comment out the next line to dump lots of info.
			if (false)
			{
				o3djs.dump.dump('---dumping context---\n');
				o3djs.dump.dumpParamObject(context);

				o3djs.dump.dump('---dumping root---\n');
				o3djs.dump.dumpTransformTree(g_client.root);

				o3djs.dump.dump('---dumping render root---\n');
				o3djs.dump.dumpRenderNodeTree(g_client.renderGraphRoot);

				o3djs.dump.dump('---dump g_pack shapes---\n');
				var shapes = pack.getObjectsByClassName('o3d.Shape');
				for (var t = 0; t < shapes.length; t++) 
				{
					o3djs.dump.dumpShape(shapes[t]);
				}

				o3djs.dump.dump('---dump g_pack materials---\n');
				var materials = pack.getObjectsByClassName('o3d.Material');
				for (var t = 0; t < materials.length; t++)
				{
					o3djs.dump.dump ('  ' + t + ' : ' + materials[t].className +
					' : "' + materials[t].name + '"\n');
					o3djs.dump.dumpParams(materials[t], '    ');
				}

				o3djs.dump.dump('---dump g_pack textures---\n');
				var textures = pack.getObjectsByClassName('o3d.Texture');
				for (var t = 0; t < textures.length; t++)
				{
					o3djs.dump.dumpTexture(textures[t]);
				}

				o3djs.dump.dump('---dump g_pack effects---\n');
				var effects = pack.getObjectsByClassName('o3d.Effect');
				for (var t = 0; t < effects.length; t++)
				{
					o3djs.dump.dump('  ' + t + ' : ' + effects[t].className +
					' : "' + effects[t].name + '"\n');
					o3djs.dump.dumpParams(effects[t], '    ');
				}
			}
		}
	}

	
	if(oH_loadingFirstFile)
	{
		g_pack = g_client.createPack();
		oH_loadingFirstFile=false;		
	}
	
	// Create a new transform for the loaded file
	var mesh = g_pack.createObject('Transform');
	mesh.parent = g_client.root;
	if (path != null)
	{
		//g_loadingElement.innerHTML = "Loading: " + path;
		//enableInput(false);
		try
		{
			o3djs.scene.loadScene(g_client, g_pack, mesh, path, callback);
		}
		catch(e)
		{
			//enableInput(true);
		//	g_loadingElement.innerHTML = "loading failed : " + e;
		}
	}
	
	updateInfo();

	return mesh;
	
}

function updateInfo()
{
	if (!g_treeInfo) 
	{
		g_treeInfo = o3djs.picking.createTransformInfo(g_client.root,null);
	}
	g_treeInfo.update();
}

function startDragging(e)
{
	g_lastRot = g_thisRot;
	g_aball.click([e.x, e.y]);
	g_dragging = true;
//	if(e.shiftKey)
	pick(e);
}

function drag(e)
{
	if (g_dragging)
	{
		var rotationQuat = g_aball.drag([e.x, e.y]);
		var rot_mat = g_quaternions.quaternionToRotation(rotationQuat);
		g_thisRot = g_math.matrix4.mul(g_lastRot, rot_mat);

			

		for(i=0;i<oH_obj.length;i++)
		{
			var meshRot = oH_obj[i].localMatrix;
			g_math.matrix4.setUpper3x3(meshRot, g_thisRot);
			oH_obj[i].localMatrix = meshRot;
		
		}
	
	}
}

function stopDragging(e)
{
	g_dragging = false;
}

function updateCamera()
{
	var up = [0, 1, 0];
	g_viewInfo.drawContext.view = g_math.matrix4.lookAt(g_camera.eye,
	g_camera.target,
	up);
	g_lightPosParam.value = g_camera.eye;
}

function updateProjection()
{
	// Create a perspective projection matrix.
	g_viewInfo.drawContext.projection = g_math.matrix4.perspective(
	g_math.degToRad(45), g_o3dWidth / g_o3dHeight, g_camera.nearPlane,
	g_camera.farPlane);
}
/*
function enableInput(enable)
{
	document.getElementById("url").disabled = !enable;
	document.getElementById("load").disabled = !enable;
}*/

function setClientSize()
{
	var newWidth  = parseInt(g_client.width);
	var newHeight = parseInt(g_client.height);

	if (newWidth != g_o3dWidth || newHeight != g_o3dHeight) 
	{
		g_o3dWidth = newWidth;
		g_o3dHeight = newHeight;

		updateProjection();

		// Sets a new area size for arcball.
		g_aball.setAreaSize(g_o3dWidth, g_o3dHeight);
	}
}

/**
 *  Called every frame.
 */
function onRender(renderEvent) 
{
	// If we don't check the size of the client area every frame we don't get a
	// chance to adjust the perspective matrix fast enough to keep up with the
	// browser resizing us.
	setClientSize();
	
	if( flashing && flashTimer <= flashDURATION )
	{
			
			flashTimer = flashTimer + renderEvent.elapsedTime*1000;
			/*
			if ((flashTimer % 2*flashINTERVAL) < flashINTERVAL && flashedThisInterval==false ) {
				flashMode = -flashMode;
				
				if(flashType == "COLOR")				
				highlight(flashObject, flashMode);
				else
				highlightMesh(flashMode);
				
				flashedThisInterval = true;
			}
			else if( flashTimer % 2*flashINTERVAL > flashINTERVAL && flashedThisInterval)
			{
				flashedThisInterval = false;
			}
			*/

			if( flashedThisInterval == false )
			{
				flashMode = -flashMode;
				
				if(flashType == "COLOR")				
				highlight(flashObject, flashMode);
				else
				highlightMesh(flashMode);
				
				flashedThisInterval = true;
				flashCounter++;
				
				
			}
			else if( flashedThisInterval == true  && flashTimer > flashINTERVAL*flashCounter )
			{
				
				flashedThisInterval = false;
				
			
			}

	}
	else
	{
			
				if (flashing) {
				//This condition occurs only when the time for flashing runs off with the 
				// flashing flag still true.				
				
					if (flashType == "COLOR") {
						if (flashOrigColor) {
							//We need to restore the object to its original brightness if needed
							highlight(flashObject, -1);
						}
					}
					else {
						if(g_highlightShape)
						highlightMesh(-1);
					}
					flashMode = -1;
					
					//Turn off flashing
					flashing = false;
					
					//Reset counter
					flashTimer   = 0.0;
					flashCounter = 0;
					//Remove orig Color
					flashOrigColor = null;
					g_highlightShape = null;
				}
			
	}
}


/**
 * Removes any callbacks so they don't get called after the page has unloaded.
 */
function uninit() 
{
		
	if (g_client)
	{
	oH_loadingFirstFile=true;
	g_client.cleanup();
	}
	
}

function pan(x,y,z)
{

	for(i=0;i<oH_obj.length;i++)
	oH_obj[i].translate(x,y,z);	
}

function scale(scaleValue)
{	

	for(i=0;i<oH_obj.length;i++)
	oH_obj[i].scale(scaleValue,scaleValue,scaleValue);
}

function zoomScroller(t)
{
	g_camera.eye = g_math.lerpVector(g_camera.target, g_camera.eye, t);
	updateCamera();
}

function scrollMe(e)
{
	if (e.deltaY)
	{
		var t = 1;
		if (e.deltaY > 0)
		t = 11/12;
	else
		t = 13/12;
	g_camera.eye = g_math.lerpVector(g_camera.target, g_camera.eye, t);
	updateCamera();
	}
}

function buttonRotate(e)
{	
	switch(e.charCode)
	{
		case 119:	//W Key
		buttonRotation(20,0);
		break;
		
		case 115:	//S Key
		buttonRotation(-20,0);
		break;
		
		case 97:	//A Key
		buttonRotation(-20,1);
		break;
		
		case 100:	//D  Key
		buttonRotation(20,1);
		break;
		
		case 106:
		pan(-0.5,0,0);
		break;
		
		case 108:
		pan(0.5,0,0);
		break;
		
		case 105:
		pan(0,0,0.5);
		break;
		
		case 107:
		pan(0,0,-0.5);
		break;
		
		
		default:
		break;
	}
}

function buttonRotation(angle,axis)
{
	var rotationQuat;
	var rot_mat;
	
	g_lastRot = g_thisRot;	
		
	if (axis == 0) {

		for(i=0;i<oH_obj.length;i++)
		oH_obj[i].quaternionRotate(g_quaternions.rotationX(-angle));
		
		rotationQuat = g_quaternions.rotationX(-angle);
		
	}
	else if (axis == 1) {

		for(i=0;i<oH_obj.length;i++)
		oH_obj[i].quaternionRotate(g_quaternions.rotationY(angle));
		
		rotationQuat = g_quaternions.rotationY(angle);
	}
	else {

		for(i=0;i<oH_obj.length;i++)
		oH_obj[i].quaternionRotate(g_quaternions.rotationZ(angle));
		
		rotationQuat = g_quaternions.rotationZ(angle);
	}
	
	rot_mat = g_quaternions.quaternionToRotation(rotationQuat);
	g_thisRot = g_math.matrix4.mul(g_lastRot, rot_mat);
	
}

function pick(e)
{
	
	if (flashing) {
				//This condition occurs only when the time for flashing runs off with the 
				// flashing flag still true.				
				
					if (flashType == "COLOR") {
						if (flashOrigColor) {
							//We need to restore the object to its original brightness if needed
							highlight(flashObject, -1);
						}
					}
					else {
						//Here we need to remove duplicated mesh once the highlighting is done
						if(g_highlightShape)
						highlightMesh(-1);
					}
					flashMode = -1;
					
					//Turn off flashing
					flashing = false;
					
					//Reset counter
					flashTimer = 0.0;
					flashCounter = 0;

					//Remove orig Color
					flashOrigColor = null;
					g_highlightShape = null;
				}
		
	var worldRay = o3djs.picking.clientPositionToWorldRay(
	e.x,
	e.y,
	g_viewInfo.drawContext,
	g_client.width,
	g_client.height
	);
	
	// Update the entire tree in case anything moved.
	g_treeInfo.update();
 
	var pickInfo = g_treeInfo.pick(worldRay);
	
	if (pickInfo) 
	{

		g_selectedInfo = pickInfo;
		//g_loadingElement.innerHTML = g_selectedInfo.shapeInfo.parent.transform.name + ' clicked';

		if (flashType == "COLOR") {
			
			flashObject = pickInfo.shapeInfo.shape;
			flashing = true;
			flashedThisInterval = false;
		}
		else
		{
			setupHighlightMeshMaterial(pickInfo);
			flashing = true;
			flashedThisInterval = false;
		}
		
		
	} 
	else
	{   
	//	g_loadingElement.innerHTML = 'Nothing selected';	
	}
}

function info()
{
	if(g_selectedInfo)
	{
//		$("#dialog2").attr("src","http://en.wikipedia.org/wiki/"+bodyParts[objectsPicked[i]]);
//		$("#dialog2")[0].src="http://en.wikipedia.org/wiki/"+g_selectedInfo.shapeInfo.parent.transform.name;
//		$("#dialog2").dialog("open");
		var mywin = window.open('about:blank', 'mywin');
		mywin.location.href = "http://en.wikipedia.org/wiki/"+g_selectedInfo.shapeInfo.parent.transform.name;
	}
}

/*
 * Function that highlights the the object by increasing or decreasing its brightness
 * i.e the brightness, by converting RGB to HSV and back
 * Takes a shape argument which is the model to be highlighted
 * Mode is either 1 or -1 depending on whether the object is being lit up or dimmed down
 */
function highlight(model_shape,mode)
{
	
	var element_list = model_shape.elements;
    for (var i = 0; i < element_list.length; i++) {
     	
		var mat_rgba = element_list[i].material.getParam('ambient').value;
	  	
		
		
	  	if(mat_rgba)
		{
			if(!flashOrigColor)
			flashOrigColor = mat_rgba;
			
			if (mode == 1) {
				//First convert RGB to HSV. RGB values used by o3d in [0,1]
				//Thus they need to be multiplied by 256 to bring it to standard format
				mat_hsva = rgbToHsv(mat_rgba[0] * 256, mat_rgba[1] * 256, mat_rgba[2] * 256);
				
				//The fourth alpha parameter may not mean much other than 1 but just in case
				var alpha = mat_rgba[3];
				
				//Increase brightness of the object by 50% of however more possible
				//Or decrease it by the same amount based on the value of mode
				mat_hsva[2] = mat_hsva[2] + mode * (100 - mat_hsva[2]) * 0.3;
				mat_hsva[0] = mat_hsva[0] + mode * (100 - mat_hsva[0]) * 0.3;
				mat_hsva[1] = mat_hsva[1] + mode * (100 - mat_hsva[1]) * 0.3;
				mat_hsva[3] = mat_hsva[3] + mode * (100 - mat_hsva[3]) * 0.7;
				//mat_hsva[0] = 0.162;
				//mat_hsva[1] = 0.592;
				//mat_hsva[2] = 1.000;
				//mat_hsva[3] = 1;
				//0.992, 1.000, 0.329
				//Convert back to RGB			
				mat_rgba = hsvToRgb(mat_hsva[0], mat_hsva[1], mat_hsva[2]);
				
				//Assign these values to element's material			
				element_list[i].material.getParam('ambient').value = [mat_rgba[0] / 256, mat_rgba[1] / 256, mat_rgba[2] / 256, alpha];
			}
			
			else{
				element_list[i].material.getParam('ambient').value = flashOrigColor;
			}
		}
	  
    }
	
}

function highlightMesh(mode)
{
	     	
	if(mode == 1){
		 highlightMeshMaterial();
	}
	else{
		restoreMeshMaterial();
	}
	
}

function setupHighlightMeshMaterial(g_selectedMesh)
{
	
	g_highlightShape =  g_selectedMesh.shapeInfo.shape;
	g_highlightMaterial.getParam('color').value = [0.992, 1.000, 0.329, 1];					  
    // Set all of it's elements to use the highlight material.
    var elements = g_highlightShape.elements;
    for (var ee = 0; ee < elements.length; ee++) {
	origMaterial[ee] = elements[ee].material;
      elements[ee].material = g_highlightMaterial;
    }
	
	
}

function highlightMeshMaterial()
{
	
	if(g_highlightShape){	
	var elements =  g_highlightShape.elements;
   	 for (var ee = 0; ee < elements.length; ee++) {
		
   		elements[ee].material = g_highlightMaterial;
    	 }
	}

}


function restoreMeshMaterial()
{	
	// Restore all of it's elements to use the highlight material.
	if(g_highlightShape){	
   	 var elements =  g_highlightShape.elements;
   	 for (var ee = 0; ee < elements.length; ee++) {
		
   		elements[ee].material = origMaterial[ee];
    	  }
	}
}

function hide()
{
	// Add it to the same transform
	if(g_selectedInfo)
	{
		//g_selectedInfo.shapeInfo.parent.transform.visible = true;
		g_selectedInfo.shapeInfo.parent.transform.translate(100,100,100);
	//	g_loadingElement.innerHTML = g_selectedInfo.shapeInfo.parent.transform.name+" hidden";
		removedObjects.push(g_selectedInfo.shapeInfo.parent.transform);
	}
	
	//Remove the rayinfo after the hide so that it doesnt muck up things later
	g_selectedInfo = null;
}

function show()
{
	if(removedObjects.length > 0)
	{
		var obj = removedObjects.pop();
		obj.translate(-100,-100,-100);
	//	g_loadingElement.innerHTML = obj.name+" shown";
	}
}

function hideall()
{
	for (var i = 0; i<oH_obj.length;i++)
	{
		oH_obj[i].translate(100,100,100);
		removedObjects.push(oH_obj[i]);
	}
//	g_loadingElement.innerHTML = "All objects hidden";
}

function showall()
{
	if(removedObjects.length != 0)
	{
		for(i=0;removedObjects.length !=0;)
		{
			var obj=removedObjects.pop();
			obj.translate(-100,-100,-100);
			
		}
//		g_loadingElement.innerHTML = "All objects shown";
	}
	
}

function resetView()
{
	var bbox = o3djs.util.getBoundingBoxOfTree(g_client.root);

	g_camera.target = g_math.lerpVector(bbox.minExtent, bbox.maxExtent, 0.5);

	var diag = g_math.length(g_math.subVector(bbox.maxExtent,bbox.minExtent));

	g_camera.eye = g_math.addVector(g_camera.target, [0, 0, 1 * diag]);
	g_camera.nearPlane = diag / 1000;
	g_camera.farPlane = diag * 10;
	setClientSize();
	updateCamera();
	updateProjection();
	showall()
}

/*
*	The following RGB-HSV code is courtesy of Matt Haynes
* 	taken from http://matthaynes.net/blog/2008/08/07/javascript-colour-functions/
*/



/**
* Converts HSV to RGB value.
*
* @param {Integer} h Hue as a value between 0 - 360 degrees
* @param {Integer} s Saturation as a value between 0 - 100 %
* @param {Integer} v Value as a value between 0 - 100 %
* @returns {Array} The RGB values  EG: [r,g,b], [255,255,255]
*/
function hsvToRgb(h,s,v) {

    var s = s / 100,
         v = v / 100;

    var hi = Math.floor((h/60) % 6);
    var f = (h / 60) - hi;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    var rgb = [];

    switch (hi) {
        case 0: rgb = [v,t,p];break;
        case 1: rgb = [q,v,p];break;
        case 2: rgb = [p,v,t];break;
        case 3: rgb = [p,q,v];break;
        case 4: rgb = [t,p,v];break;
        case 5: rgb = [v,p,q];break;
    }

    var r = Math.min(255, Math.round(rgb[0]*256)),
        g = Math.min(255, Math.round(rgb[1]*256)),
        b = Math.min(255, Math.round(rgb[2]*256));

    return [r,g,b];

}	

/**
* Converts RGB to HSV value.
*
*
* 
* @param {Integer} r Red value, 0-255
* @param {Integer} g Green value, 0-255
* @param {Integer} b Blue value, 0-255
* @returns {Array} The HSV values EG: [h,s,v], [0-360 degrees, 0-100%, 0-100%]
*/
function rgbToHsv(r, g, b) {

    var r = (r / 255),
         g = (g / 255),
  	 b = (b / 255);	

    var min = Math.min(Math.min(r, g), b),
        max = Math.max(Math.max(r, g), b),
        delta = max - min;

    var value = max,
        saturation,
        hue;

    // Hue
    if (max == min) {
        hue = 0;
    } else if (max == r) {
        hue = (60 * ((g-b) / (max-min))) % 360;
    } else if (max == g) {
        hue = 60 * ((b-r) / (max-min)) + 120;
    } else if (max == b) {
        hue = 60 * ((r-g) / (max-min)) + 240;
    }

    if (hue < 0) {
        hue += 360;
    }

    // Saturation
    if (max == 0) {
        saturation = 0;
    } else {
        saturation = 1 - (min/max);
    }

    return [Math.round(hue), Math.round(saturation * 100), Math.round(value * 100)];
}

/**
 * Loads a texture and saves it in the g_textures array.
 * @param {Object} loader The loader to load with.
 * @param {stinrg} url of texture to load
 * @param {number} index Index to put texture in g_textures
 */
