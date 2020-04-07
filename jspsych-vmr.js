/*
 * Visuomotor rotation (VMR) plug-in 
 */ 


jsPsych.plugins["vmr"] = (function() {

  var plugin = {};

  plugin.info = {
    name: "vmr",
    parameters: {  // Define all input parameters and their corresponding default values
      perturbation_angle: {
      pretty_name: "Perturbation angle",
      type: jsPsych.plugins.parameterType.INT,
      default: 0,
      description: "Degree of visuo-motor rotation"
      },
      cursor_radius: {
        type: jsPsych.plugins.parameterType.INT, // BOOL, STRING, INT, FLOAT, FUNCTION, KEYCODE, SELECT, HTML_STRING, IMAGE, AUDIO, VIDEO, OBJECT, COMPLEX
        pretty_name: "Cursor radius",
        default: 6,
        description: "Cursor radius in pixels"
      },
      home_radius: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: "Home radius",
        default: 10,
        description: "Home radius in pixels"
      },
      target_radius: {
        pretty_name: "Target radius",
        type: jsPsych.plugins.parameterType.INT, 
        default: 12,
        description: "Target radius in pixels"
      },
      home_location: {
        pretty_name: "Home location",
        type: jsPsych.plugins.parameterType.INT, 
        default: [screen.availWidth/2,.75*screen.availHeight],
        array: true,
        description: "x and y coordinates of home position in pixels"
      },
      target_location: {
        pretty_name: "Target location",
        type: jsPsych.plugins.parameterType.INT, 
        default: [screen.availWidth/2,.25*screen.availHeight],
        array: true,
        description: "x and y coordinates of target in pixels"
      },
      cursor_color: {
        type: jsPsych.plugins.parameterType.STRING, 
        pretty_name: "Cursor color",
        default: '#ff0000',
        description: "Cursor color"
      },
      home_color: {
        type: jsPsych.plugins.parameterType.STRING, 
        pretty_name: "Home color",
        default: '#999999',
        description: "Home color"
      },
      target_color: {
        type: jsPsych.plugins.parameterType.STRING, 
        pretty_name: "Target color",
        default: '#ffcc00',
        description: "Target color"
      },
      onset_delay:{
        type: jsPsych.plugins.parameterType.INT, 
        pretty_name: "Onset delay",
        default: 250,
        description: "Target onset delay (in ms)"
      },
      feedback_dur:{
        type: jsPsych.plugins.parameterType.INT, 
        pretty_name: "Feedback duration",
        default: 750,
        description: "Feedback duration (in ms)"
      },
      background_color: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Background color",
        default: "black",
        description: "Screen background color"
      }
    }
  }



	//BEGINNING OF TRIAL 
  plugin.trial = function(display_element, trial) {

		//--------------------------------------
		//----------- SET UP CANVAS ------------
    //--------------------------------------

		//Create a canvas element and append it to the DOM
		var canvas = document.createElement("canvas");
    display_element.appendChild(canvas); 
    
    // clear canvas & hide cursor
    canvas.style.cursor = 'none';

		
		//The document body IS 'display_element' (i.e. <body class="jspsych-display-element"> .... </body> )
		var body = document.getElementsByClassName("jspsych-display-element")[0];
		
		//Save the current settings to be restored later
		var originalMargin = body.style.margin;
		var originalPadding = body.style.padding;
		var originalBackgroundColor = body.style.backgroundColor;
		
		//Remove the margins and paddings of the display_element
		body.style.margin = 0;
		body.style.padding = 0;
		body.style.backgroundColor = trial.background_color; //Match the background of the display element to the background color of the canvas so that the removal of the canvas at the end of the trial is not noticed

		//Remove the margins and padding of the canvas
		canvas.style.margin = 0;
		canvas.style.padding = 0;		
		
		//Get the context of the canvas so that it can be painted on.
		var ctx = canvas.getContext("2d");

		//Declare variables for width and height, and also set the canvas width and height to the window width and height
		var canvasWidth = canvas.width = window.innerWidth;
		var canvasHeight = canvas.height = window.innerHeight;
    var centerX = canvasWidth / 2;
    var centerY = canvasHeight / 2;


		//Set the canvas background color
		canvas.style.backgroundColor = trial.background_color;




		//--------------------------------------
		//------------- RUN TRIAL --------------
    //--------------------------------------

    //This is the main part of the trial that makes everything run

    //Initialize new global variables for the current trial
    var perturbationAngle = trial.perturbation_angle*Math.PI/180; // convert to radians

    var cursor = {
      x: -1,
      y: -1,
      xDisplayed: -1,
      yDisplayed: -1,
      radius: trial.cursor_radius,
      colorHex: trial.cursor_color,
      distanceToHome: 0,
      distanceToTarget: 0,
      atHome: 0,
      atTarget: 0
    };

    var home = {
      x: trial.home_location[0],
      y: trial.home_location[1],
      radius: trial.home_radius,
      colorHex: trial.home_color
    }

    var target = {
      x: trial.target_location[0],
      y: trial.target_location[1],
      radius: trial.target_radius,
      colorHex: trial.target_color
    }


    // initialize variables to be saved in every trial
    var data = {
      RT: undefined,
      MT: undefined,
      xArray: [],
      yArray: [],
      timeArray: [],
      frameRate: [], //How often monitor refreshes (in ms)
      missTrial: 0
    }


    var trialStartTime = undefined;
    var stateStartTime;
    var currentTimestamp;
    var previousTimestamp;
    var frameRequestID;


    // States
    var SETUP = 0;
    var START = 1;
    var GO = 2;
    var MOVING = 3;
    var FEEDBACK = 4;
    var TRIALEND = 5;

    var currentState = SETUP;


    // Initialize mouse event handler to get mouse x-/y-coordinates
    document.onmousemove = handleMouseMove; // set the mousemove event handler to be our function

    function handleMouseMove(event) {
        //var eventDoc, doc, body;
        event = event || window.event; // Support for IE?

        cursor.velx = event.movementX;
        cursor.vely = event.movementY;
        cursor.x = event.pageX;
        cursor.y = event.pageY;
    }


    //This runs the trial, according to the frame refresh rate of the screen.
    stateProcess();
	
    // Everything in here is looping
    function stateProcess() {

      frameRequestID = window.requestAnimationFrame(stateProcess); // Calls for another frame request (according to monoitor's FR)

      currentTimestamp = performance.now(); //Variable to hold current timestamp when frame was initiated

      // if first frame
      if (trialStartTime === undefined) { 
        trialStartTime = currentTimestamp;
        previousTimestamp = trialStartTime; // for first frame, previous time stamp = current time
      };

      //canvas.dispatchEvent(new Event('mousemove'));

      cursor.vel_sq = Math.pow(cursor.velx,2)+Math.pow(cursor.vely,2);
    	cursor.xDisplayed = home.x+((cursor.x-home.x)*Math.cos(perturbationAngle)-(cursor.y-home.y)*Math.sin(perturbationAngle));
      cursor.yDisplayed = home.y+((cursor.x-home.x)*Math.sin(perturbationAngle)+(cursor.y-home.y)*Math.cos(perturbationAngle));
    
      // Compute distances to home and target
      cursor.distanceToHome = Math.sqrt(Math.pow(cursor.xDisplayed-home.x,2)+Math.pow(cursor.yDisplayed-home.y,2));
      cursor.distanceToTarget = Math.sqrt(Math.pow(cursor.xDisplayed-target.x,2)+Math.pow(cursor.yDisplayed-target.y,2));
      cursor.atHome = cursor.distanceToHome < (home.radius-cursor.radius); // cursor fully inside home circle?
      cursor.atTarget = cursor.distanceToTarget < (target.radius-cursor.radius); // cursor fully inside home circle?

      canvasHeaderText = '';
      
      switch (currentState){

    		case SETUP:
    			stateStartTime = performance.now(); // ALWAYS RESET THE STATE TIMER WHEN ADVANCING STATE
    			currentState = START;
    			break;

    		case START:
    			if (cursor.atHome){
    				canvasHeaderText = 'Get set...'
    				if ((currentTimestamp-stateStartTime)>trial.onset_delay){
	    				stateStartTime = performance.now(); // ALWAYS RESET WHEN ADVANCING
	    				currentState=GO;
	    			}
    			}else{
    				canvasHeaderText = 'Move the cursor inside the gray dot.'
    				stateStartTime = performance.now(); // reset the state timer
    			}
    			break;

			case GO:
				canvasHeaderText = 'GO!'
				if (!cursor.atHome){
          data.RT = performance.now()-stateStartTime;
					stateStartTime = performance.now(); // ALWAYS RESET
					currentState=MOVING;
				}
				break;

			case MOVING:
				canvasHeaderText = 'GO!'
				if (cursor.atTarget && cursor.vel_sq<9){ // speed in px/frame 
          data.MT = performance.now()-stateStartTime;
          stateStartTime = performance.now(); // RESET
					currentState=FEEDBACK;
				}
				break;

			case FEEDBACK: // This should only run one time!
				canvasHeaderText = 'Target acquired! (+1)' // State doesn't last long enough for this to be visible
        
        if ((performance.now() - stateStartTime) > trial.feedback_dur) {
				  stateStartTime = performance.now(); // RESET
				  currentState = TRIALEND;
        }
				break;

			case TRIALEND:
        canvasHeaderText = ' '
        cancelAnimationFrame(frameRequestID);
        end_trial();
        break;

      }
      
      //*---------- Draw -----------*//
      ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clear previous drawing within canvas
      draw_text(canvasHeaderText,30); // Write the header text

      if (currentState<TRIALEND){ // If we're not done
        // Draw home position
        draw_circle(home.x,home.y,home.radius,home.colorHex,1);

        // Draw target position
        if (currentState>=GO){ // If we've waited at home long enough
          draw_circle(target.x,target.y,target.radius,target.colorHex,1);
        }
	      
	// Draw cursor
        draw_circle(cursor.xDisplayed,cursor.yDisplayed,cursor.radius,cursor.colorHex,1);
      }


      // Store frame-by-frame data
      if (currentState==MOVING || currentState==GO){
        data.xArray.push(cursor.x);
        data.yArray.push(cursor.y);
        data.timeArray.push(Math.round(100 * (currentTimestamp - trialStartTime + Number.EPSILON)) / 100); // save time stamps (rounded to 2 decimals; number.EPSILON avoids rounding errors)
      }
      data.frameRate.push(Math.round(100 * (currentTimestamp - previousTimestamp + Number.EPSILON)) / 100); //Push the interval into the frameRate array (rounded to 2 decimals; number.EPSILON avoids rounding errors)
      previousTimestamp = currentTimestamp; //Update previous time stamp 

    }

      
    //Function to draw a filled-in circle
    function draw_circle(x,y,radius,hexcol,isFilled){
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2*Math.PI, false); //2*Math.PI
      if (isFilled) {
        ctx.fillStyle = hexcol;
        ctx.fill();
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = hexcol;
      ctx.stroke();
    }

    function draw_text(string,ypos){
      ctx.font = '12pt Helvetica';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'white';
      ctx.fillText(string, canvasWidth/2, ypos);
    }


    //Function to end the trial & write data
    function end_trial() {

      //Place all the data to be saved from this trial in one data object
      var trial_data = { 
        "RT": Math.round(100 * (data.RT + Number.EPSILON)) / 100, // Response time (rounded to nearest ms)
        "MT": Math.round(100 * (data.MT + Number.EPSILON)) / 100, // Movement time (excluding RT)
        "cursorX": JSON.stringify(data.xArray), // Cursor x-coordinates, in the form of a JSON string
        "cursorY": JSON.stringify(data.yArray), // Cursor y-coordinates
        "Time": JSON.stringify(data.timeArray), // Array of time stamps for each trajectory data point
        "frameTime": JSON.stringify(data.frameRate), // Array of frame time in this trial
        "nFrames": data.frameRate.length, // Number of frames in this trial    
        "avgFR": data.frameRate.reduce((total,current) => total + current)/data.frameRate.length // Average frame rate of trial  
      }
      
      //Remove the canvas as the child of the display_element element
      display_element.innerHTML='';
      
      //Restore the settings to JsPsych defaults
      body.style.margin = originalMargin;
      body.style.padding = originalPadding;
      body.style.backgroundColor = originalBackgroundColor;
      
      body.style.cursor = 'none'; // still hiding cursor

      //End this trial and move on to the next trial
      jsPsych.finishTrial(trial_data); // this function automatically writes all the trial_data
      
    } //End of end_trial

  };

  return plugin;
})();
