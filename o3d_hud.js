/*
*
*
*	Open Human Project - HUD/GUI
*
*
*	This file contains cpde related to the HUD overlay over the OH o3d Web app
*
*
*
*/


//Constructor for the HUD.
// pack 	   - the applications object pack
// client	   - entry point of the O3D application
// priority	   - Draw priority of HUD needed	

function o3d_hud(pack,client,priority,materials) {

	 //Create root transform for HUD
	 this.Root = pack.createObject('Transform');

	 // Create a second view for the hud. 
  	this.ViewInfo = o3djs.rendergraph.createBasicView(
      			  pack,
        		  this.Root,
                          client);

	 // Make sure the hud gets drawn after the 3d stuff
 	 this.ViewInfo.root.priority = priority + 1;

	  // Turn off clearing the color for the hud since that would erase the 3d
	  // parts but leave clearing the depth and stencil so the HUD is unaffected
	  // by anything done by the 3d parts.
 	 this.ViewInfo.clearBuffer.clearColorFlag = false;

	 // Set culling to none so we can flip images using rotation or negative scale.
 	 this.ViewInfo.zOrderedState.getStateParam('CullMode').value = g_o3d.State.CULL_NONE;
 	 this.ViewInfo.zOrderedState.getStateParam('ZWriteEnable').value = false;
 
	  // Create an orthographic matrix for 2d stuff in the HUD.
 	 // We assume the area is 800 pixels by 600 pixels and therefore we can
 	 // position things using a 0-799, 0-599 coordinate system. If we change the
 	 // size of the client area everything will get scaled to fix but we don't
 	 // have to change any of our code. See 2d.html
	
	this.ViewInfo.drawContext.projection = g_math.matrix4.orthographic(
	      -g_client.width * 0.5 + 0.5,
	       g_client.width * 0.5 + 0.5,
	       g_client.height * 0.5 + 0.5,
	      -g_client.height * 0.5 + 0.5,
	       0.001,
	       1000);
	
         this.ViewInfo.drawContext.view = g_math.matrix4.lookAt(
      		[0, 0, 1],  // eye
      		[0, 0, 0],  // target
      		[0, 1, 0]); // up

	this.materials = [];
	//Setup the materials for the HUD. Unlike the models this must be done manually
	 //For now we have just one material. We may later have to add more.
	 for (var i = 0; i < materials.length; ++i)
	 {
   		 var effect = pack.createObject('Effect');
   		 o3djs.effect.loadEffect(effect, materials[i]);
 
 		   // Create a Material for the effect.
 		   var material = pack.createObject('Material');
 
 		   // Apply our effect to this material.
 		   material.effect = effect;
 
 		   // Create the params the effect needs on the material.
 		   effect.createUniformParameters(material);
 
		    // Set the default params. We'll override these with params on transforms.
		    material.getParam('colorMult').value = [1, 1, 1, 1];
 
  			this.materials[i] = material;
			
			this.materials[i].drawList = this.ViewInfo.zOrderedDrawList;
 	 }
	  
	// Create a 2d plane for images. createPlane makes an XZ plane by default
  	// so we pass in matrix to rotate it to an XY plane. We could do
  	// all our manipluations in XZ but most people seem to like XY for 2D.
  		this.planeShape = o3djs.primitives.createPlane(
  					    g_pack,
   					    this.materials[0],
   					    1,
   					    1,
   					    1,
   					    1,
  					    [[1, 0, 0, 0],
  					    [0, 0, 1, 0],
   					    [0,-1, 0, 0],
  					    [0, 0, 0, 1]]);	

		this.finishInit = new function(){
			
			// Setup the hud images.
			oH_Logo = new Image(g_textures[0], true);
			oH_Logo.transform.translate(3, 1, -2);

			
		}

		this.Image = new function(texture, opt_topLeft) {
  		// create a transform for positioning
  		this.transform = pack.createObject('Transform');
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


}



