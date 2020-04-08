/*
 * Visuomotor rotation (VMR) plug-in 
 */ 


jsPsych.plugins.vmr = (function() {

  var plugin = {};

  plugin.info = {
    name: "vmr",
    parameters: {  // Define all input parameters and their corresponding default values
      perturbation_angle: {
      pretty_name: "Perturbation angle",
      type: jsPsych.plugins.parameterType.INT, // BOOL, STRING, INT, FLOAT, FUNCTION, KEYCODE, SELECT, HTML_STRING, IMAGE, AUDIO, VIDEO, OBJECT, COMPLEX
      default: 0,
      description: "Degree of visuo-motor rotation"
      },
      error_clamp: {
      pretty_name: "Error clamp",
      type: jsPsych.plugins.parameterType.BOOL,
      default: false,
      description: "Error-clamp trial"
      },
      cursor_radius: {
        type: jsPsych.plugins.parameterType.INT, 
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
        default: [screen.availWidth/2,0.75*screen.availHeight],
        array: true,
        description: "x and y coordinates of home position in pixels"
      },
      target_angle: {
        pretty_name: "Target angle",
        type: jsPsych.plugins.parameterType.FLOAT, 
        default: 90 * Math.PI/180,
        description: "angle from home to target in RADIANS"
      },
      target_distance: {
        pretty_name: "Target distance",
        type: jsPsych.plugins.parameterType.INT, 
        default: 0.5*screen.availHeight,
        description: "distance from home to target in pixels"
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
      errorMsg_dur:{
        type: jsPsych.plugins.parameterType.INT, 
        pretty_name: "Error message duration",
        default: 1500,
        description: "Error message duration (in ms)"
      },
      timeout_RT:{
        type: jsPsych.plugins.parameterType.INT, 
        pretty_name: "RT time-out",
        default: 2000,
        description: "Deadline for response initiation (in ms)"
      },
      timeout_MT:{
        type: jsPsych.plugins.parameterType.INT, 
        pretty_name: "MT time-out",
        default: 2000,
        description: "Deadline for movement execution (in ms)"
      },
      timeout_return:{
        type: jsPsych.plugins.parameterType.INT, 
        pretty_name: "Return time-out",
        default: 5000,
        description: "Deadline to return to home position/initiate next trial (in ms)"
      },    
      background_color: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Background color",
        default: "black",
        description: "Screen background color"
      }
    }
  };



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
		body.style.overflow = 'hidden';
		body.style.width = '100%';
		body.style.height = '100%';
		body.style.backgroundColor = trial.background_color; //Match the background of the display element to the background color of the canvas so that the removal of the canvas at the end of the trial is not noticed

		//Remove the margins and padding of the canvas
		canvas.style.margin = 0;
		canvas.style.padding = 0;		
		//canvas.style.position = 'absolute';
		
		//Get the context of the canvas so that it can be painted on.
		var ctx = canvas.getContext("2d");

		//Declare variables for width and height, and also set the canvas width and height to the window width and height
		var canvasWidth = canvas.width = window.innerWidth;
		var canvasHeight = canvas.height = window.innerHeight;
		//var canvasWidth = window.innerWidth;
		//var canvasHeight = window.innerHeight;
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
      x: null,
      y: null,
      xDisplayed: null,
      yDisplayed: null,
      radius: trial.cursor_radius,
      colorHex: trial.cursor_color,
      distanceToHome: 0,
      distanceToTarget: 0,
      atHome: 0,
      atTarget: 0
    };

    var home = {
      x: screen.availWidth/2,
      y: 0.75*screen.availHeight,
      //x: trial.home_location[0],
      //y: trial.home_location[1],
      radius: trial.home_radius,
      colorHex: trial.home_color
    };

    var target = {
      distance: 0.5*screen.availHeight,
      angle: trial.target_angle, // remember it's already radians
      x: home.x+Math.cos(trial.target_angle)*0.5*screen.availHeight,
      y: home.y-Math.sin(trial.target_angle)*0.5*screen.availHeight,
      radius: trial.target_radius,
      colorHex: trial.target_color
    };
    
    console.log(home);
    console.log(target);

    // initialize variables to be saved in every trial
    var data = {
      RT: undefined,
      MT: undefined,
      xArray: [],
      yArray: [],
      //velxArray: [],
      //velyArray: [],
      velArray: [],
      trialTimeArray: [], // time since trial start
      //rawTimeArray: [], // array with raw time stamps
      stateArray: [],
      frameRate: [], // monitor refreshe interval (in ms)
      missTrial: false,
      missTrialMsg: '' // miss trial message
    };


    var trialStartTime;
    var stateStartTime;
    var currentTimestamp;
    var previousTimestamp;
    var frameRequest;
    var frameID = 1;


    // States
    var State = {
      SETUP: 0,     // initialize trial
      START: 1,     // move to home position
      DELAY: 2,     // delay before target onset (check that participant stays in home position)
      GO: 3,        // target onset/go cue
      MOVING: 4,    // participant moves to target
      FEEDBACK: 5,  // show trial feedback/warning message
      RETURN: 6,    // return movement to home position
      TRIALEND: 7,  // ends trial/saves data
      
      Current: 0,     // current state
      Last: -1,       // last state
      First: false,   // True for the first iteration in a new state.
      TimeStamp: -1,  // Time since last state change
      
    };
    
    // save state names as strings for output
    StateNames = ['Setup', 'Start', 'DELAY','GO','MOVING','FEEDBACK','RETURN','TRIALEND']; 

    var canvasHeaderText = '';
    var feedbackText = '';
    
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

      frameRequest = window.requestAnimationFrame(stateProcess); // Calls for another frame request (according to monoitor's FR)

      currentTimestamp = performance.now(); //Variable to hold current timestamp when frame was initiated

      canvas.dispatchEvent(new Event('mousemove'));

      cursor.vel_sq = Math.pow(cursor.velx,2)+Math.pow(cursor.vely,2);
      
      if (trial.error_clamp) {
        if (Math.abs(target.angle-Math.atan(-(cursor.y-home.y)/(cursor.x-home.x)))>Math.PI/2){
          cursor.xDisplayed = cursor.x;
          cursor.yDisplayed = cursor.y;
        }else{
          cursor.distanceToHome = Math.sqrt(Math.pow(cursor.x-home.x,2)+Math.pow(cursor.y-home.y,2));
          clampWeight = Math.min(1,Math.pow(cursor.distanceToHome/target.distance,0.5));
          clampX = home.x+Math.cos(target.angle)*cursor.distanceToHome;
          clampY = home.y-Math.sin(target.angle)*cursor.distanceToHome;
          cursor.xDisplayed = clampWeight*clampX + (1-clampWeight)*cursor.x;
          cursor.yDisplayed = clampWeight*clampY + (1-clampWeight)*cursor.y;
        }
      }else{
        cursor.xDisplayed = home.x+((cursor.x-home.x)*Math.cos(perturbationAngle)-(cursor.y-home.y)*Math.sin(perturbationAngle));
        cursor.yDisplayed = home.y+((cursor.x-home.x)*Math.sin(perturbationAngle)+(cursor.y-home.y)*Math.cos(perturbationAngle));
      }
    
      // Compute distances to home and target
      cursor.distanceToHome = Math.sqrt(Math.pow(cursor.xDisplayed-home.x,2)+Math.pow(cursor.yDisplayed-home.y,2));
      cursor.distanceToTarget = Math.sqrt(Math.pow(cursor.xDisplayed-target.x,2)+Math.pow(cursor.yDisplayed-target.y,2));
      cursor.atHome = cursor.distanceToHome < (home.radius-cursor.radius); // cursor fully inside home circle?
      cursor.atTarget = cursor.distanceToTarget < (target.radius-cursor.radius); // cursor fully inside home circle?


      // Store frame-by-frame data
      if (State.Current>State.SETUP && State.Current<State.TRIALEND) {
        
        // store mouse data
        data.xArray.push(cursor.x);
        data.yArray.push(cursor.y);
        data.velArray.push(cursor.vel_sq);
        
        // store timing data
        if (trialStartTime === undefined) {
          trialStartTime = currentTimestamp;
        }
        data.trialTimeArray.push(Math.round(100 * ((currentTimestamp - trialStartTime) + Number.EPSILON)) / 100); // save time stamps (rounded to 2 decimals; number.EPSILON avoids rounding errors)
        data.stateArray.push(StateNames[State.Current]);
        data.frameRate.push(Math.round(100 * ((currentTimestamp - previousTimestamp) + Number.EPSILON)) / 100); //Push the interval into the frameRate array (rounded to 2 decimals; number.EPSILON avoids rounding errors)
        
        previousTimestamp = currentTimestamp; //Update previous time stamp 

      }


      switch (State.Current){

    		case State.SETUP:
    			stateStartTime = performance.now(); // ALWAYS RESET THE STATE TIMER WHEN ADVANCING STATE
    			State.Current = State.START;
    			break;
    			
    		case State.START: 
    		  if (cursor.atHome && cursor.vel_sq===0){ // speed in px/frame 
    				canvasHeaderText = '';
	    			stateStartTime = performance.now(); // ALWAYS RESET WHEN ADVANCING
	    			State.Current=State.DELAY;
    		  }else{
    				canvasHeaderText = 'Move the cursor inside the gray dot.';
    			}
    			break;
    			
    		case State.DELAY: // check that participant stays in home position during delay period
    			if (cursor.atHome){ // cursor still at home?
    				canvasHeaderText = ''; // state only lasts 250 ms
    				if ((currentTimestamp-stateStartTime)>trial.onset_delay){
	    				stateStartTime = performance.now(); // ALWAYS RESET WHEN ADVANCING
	    				State.Current=State.GO;
	    			}
    			}else{
    				canvasHeaderText = '';
    				data.missTrial = true;
            data.missTrialMsg = 'too_early';
            stateStartTime = performance.now(); // RESET
					  State.Current=State.FEEDBACK;
    			}
    			break;

			case State.GO:
        canvasHeaderText = 'GO!';
				if (!cursor.atHome){
          data.RT = performance.now()-stateStartTime;
					stateStartTime = performance.now(); // ALWAYS RESET
					State.Current=State.MOVING;
				} else if ((performance.now() - stateStartTime) > trial.timeout_RT) { // if no response initiated, check if RT time-out
          data.missTrial = true;
          data.missTrialMsg = 'RT_timeout';
          stateStartTime = performance.now(); // RESET
					State.Current=State.FEEDBACK;
        }
				break;

			case State.MOVING:
				canvasHeaderText = 'GO!';
				if (cursor.atTarget && cursor.vel_sq<9){ // speed in px/frame 
          data.MT = performance.now()-stateStartTime;
          stateStartTime = performance.now(); // RESET
					State.Current=State.FEEDBACK;
				} else if ((performance.now() - stateStartTime) > trial.timeout_MT) { // if no target hit, check if MT time-out
          data.missTrial = true;
          data.missTrialMsg = 'MT_timeout';
          stateStartTime = performance.now(); // RESET
					State.Current=State.FEEDBACK;
        }
				break;

			case State.FEEDBACK: 
				canvasHeaderText = '';

        // Miss trials
			  if (data.missTrial){
			    if (data.missTrialMsg == 'too_early') {
			      feedbackText = 'Too early!';
			    } else if (data.missTrialMsg == 'RT_timeout') {
			      feedbackText = 'Too slow!';
			    } else if (data.missTrialMsg == 'MT_timeout') {
			      feedbackText = 'Move faster!';
			    } else if (data.missTrialMsg == 'return_timeout') {
			      feedbackText = 'Return to home position!';
			    }
			    feedbackCol = 'red';
			    if ((performance.now() - stateStartTime) > trial.errorMsg_dur) {
				    stateStartTime = performance.now(); // RESET
				    State.Current = State.RETURN;
          }

        // Successful trials
			  } else {
			    feedbackText = 'Target acquired! (+1)'; 
			    feedbackCol = 'white';
				  if ((performance.now() - stateStartTime) > trial.feedback_dur) {
				    stateStartTime = performance.now(); // RESET
				    State.Current = State.RETURN;
          }
			  }
				break;
      
      case State.RETURN: 
        canvasHeaderText = 'Move the cursor inside the gray dot.';
        if (cursor.atHome && cursor.vel_sq===0){
          stateStartTime = performance.now(); // RESET
				  State.Current = State.TRIALEND;
				} else if ((performance.now() - stateStartTime) > trial.timeout_return) { // if not back home, check if return time-out
				  data.missTrial = true;
				  data.missTrialMsg = 'return_timeout';
				  stateStartTime = performance.now(); // RESET
				  State.Current = State.FEEDBACK;
        }
        break;
        
			case State.TRIALEND:
        canvasHeaderText = ' ';
        draw_circle(cursor.xDisplayed,cursor.yDisplayed,cursor.radius,cursor.colorHex,1);
        draw_circle(home.x,home.y,home.radius,home.colorHex,1);
        draw_circle(target.x,target.y,target.radius,target.colorHex,1);
        //cancelAnimationFrame(frameRequest);
        end_trial();
        break;

      }
      
      //*---------- Draw -----------*//
      if (State.Current<State.TRIALEND) {// || State.Current==RETURN){ // If we're not done
  
        ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clear previous drawing within canvas
      
        draw_text(canvasHeaderText,[centerX,30],16,'white'); // Write the header text

        // Draw home position
        draw_circle(home.x,home.y,home.radius,home.colorHex,1);
	      
        // Draw cursor
        if (cursor.x>0 && cursor.y > 0){ // only draw if within screen (and after mouse movement initiation, otherwise cursor is shown at [0,0])
          draw_circle(cursor.xDisplayed,cursor.yDisplayed,cursor.radius,cursor.colorHex,1);
        }
        
        // Draw target position
        if (State.Current>=State.GO && State.Current!==State.RETURN && data.missTrial===false){ // don't show target if return error
          draw_circle(target.x,target.y,target.radius,target.colorHex,1);
        }

        // Show feedback in center of screen
        if (State.Current==State.FEEDBACK || (State.Current==State.RETURN && data.missTrialMsg=='return_timeout')){
          draw_text(feedbackText,[centerX,centerY],20,feedbackCol); // Write the header text
        }
      }
      
      frameID += 1;

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

    function draw_text(string,[xpos,ypos],fontSize,color){
      ctx.font = fontSize.toString() + 'pt Helvetica';
      ctx.textAlign = 'center';
      ctx.fillStyle = color;//'white';
      ctx.fillText(string, xpos, ypos);
    }


    //Function to end the trial & write data
    function end_trial() {

      //Place all the data to be saved from this trial in one data object
      var trial_data = { 
        "Pert": trial.perturbation_angle, // perturbation angle
        "ErrClamp": trial.error_clamp, // error-clamp trial?
        "RT": Math.round(100 * (data.RT + Number.EPSILON)) / 100, // Response time (rounded to nearest 2 decimals)
        "MT": Math.round(100 * (data.MT + Number.EPSILON)) / 100, // Movement time (excluding RT)
        "cursorX": JSON.stringify(data.xArray), // Cursor x-coordinates, in the form of a JSON string
        "cursorY": JSON.stringify(data.yArray), // Cursor y-coordinates
        "cursorVel": JSON.stringify(data.velArray), // Cursor velocity
        "TrialTime": JSON.stringify(data.trialTimeArray), // Array of time stamps for each trajectory data point (time point since trial start)
        //"RawTime": JSON.stringify(data.rawTimeArray),// Raw time stamp
        "State": JSON.stringify(data.stateArray), // Array of states since go cue
        "frameTime": JSON.stringify(data.frameRate), // Array of frame times in this trial
        "nFrames": frameID, //data.frameRate.length, // Number of frames in this trial    
        "avgFR": data.frameRate.reduce((total,current) => total + current)/frameID, // Average frame rate of trial  
        "missTrial": data.missTrial, // miss trial (true/false)
        "missTrialMsg": data.missTrialMsg // miss trial message/type
      };
      
      //Remove the canvas as the child of the display_element element
      display_element.innerHTML='';
      
      //Restore the settings to JsPsych defaults
      //body.style.margin = originalMargin;
      //body.style.padding = originalPadding;
      //body.style.backgroundColor = originalBackgroundColor;

      //body.style.cursor = 'none'; // still hiding cursor

      //End this trial and move on to the next trial
      cancelAnimationFrame(frameRequest);
      jsPsych.finishTrial(trial_data); // this function automatically writes all the trial_data

    } //End of end_trial

  };

  return plugin;
})();
