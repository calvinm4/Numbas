/*
Copyright 2011 Newcastle University

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

//Display code

Numbas.queueScript('scripts/display.js',['controls','math','xml','util','timing','jme','jme-display'],function() {
	
	var MathJaxQueue = MathJax.Callback.Queue(MathJax.Hub.Register.StartupHook('End',{}));

	var util = Numbas.util;

var display = Numbas.display = {
	// update progress bar when loading
	showLoadProgress: function()
	{
		var p= 100 * Numbas.schedule.completed / Numbas.schedule.total;
		$('#progressbar #completed').width(p+'%');
	},

	//display code to be called before anything else has happened
	init: function()
	{
		//hide the various content-display bits
		$('.mainDisplay > *').hide();
		//show the page;
		$('#loading').hide();
		$('#everything').show();

		$(document).keydown( function(e)
		{
			if(!Numbas.exam.inProgress) { return; }

			if(display.inInput || $('#jqibox:visible').length)
				return;
			
			switch(e.keyCode)
			{
			case 37:
				Numbas.controls.previousQuestion();
				break;
			case 39:
				Numbas.controls.nextQuestion();
				break;
			}
		});
	},

	// does an input element currently have focus?
	inInput: false,

	//alert / confirm boxes
	//

	showAlert: function(msg) {
		$.prompt(msg);
	},

	showConfirm: function(msg,fnOK,fnCancel) {
		fnOK = fnOK || function(){};
		fnCancel = fnCancel || function(){};
		$.prompt(msg,{overlayspeed: 'fast', buttons:{Ok:true,Cancel:false},callback: function(val){ val ? fnOK() : fnCancel(); }});
	},

	//make MathJax typeset any maths in elem (or whole page if elem not given)
	typeset: function(selector,callback)
	{
		try
		{
			if(!selector)
				selector = $('body');

			$(selector).each(function(i,elem) {
				MathJaxQueue.Push(['Typeset',MathJax.Hub,elem]);
			});
			if(callback)
				MathJaxQueue.Push(callback);
		}
		catch(e)
		{
			if(MathJax===undefined && !display.failedMathJax)
			{
				display.failedMathJax = true;
				display.showAlert("Failed to load MathJax. Maths will not be typeset properly.\n\nIf you are the exam author, please check that you are connected to the internet, or modify the theme to load a local copy of MathJax. Instructions for doing this are given in the manual.");
			}
			else
			{
				Numbas.showError(e);
			}
		};
	}

};



//display properties of exam object
display.ExamDisplay = function(e) 
{
	this.e=e;

	//display exam title at top of page
	$('#examBanner').html(e.name);

	//'next' button always present
	$('*').find("#nextBtn").click( Numbas.controls.nextQuestion );
	
	//show 'previous' button if allowed
	if( e.navigateReverse )
	{
		$('*').find("#prevBtn").click( Numbas.controls.previousQuestion ).show();
	}
	else
	{
		$('*').find("#prevBtn").hide();
	}

	//register 'show advice' button
	var adviceBtns = $('*').find('#adviceBtn');
	adviceBtns.click( Numbas.controls.getAdvice );
	if(e.adviceType=='triggerbutton')
		adviceBtns.show();
	else
		adviceBtns.hide();

	//display 'reveal' button if allowed
	var revealBtns = $('*').find('#revealBtn');
	revealBtns.click( Numbas.controls.revealAnswer );
	if(e.allowRevealAnswer)
		revealBtns.show();
	else
		revealBtns.hide();

	//register 'submit question' button
	$('*').find('#submitBtn').click( Numbas.controls.submitQuestion );
	
	//register 'try another question like this one' button
	if(e.allowRegen)
		$('*').find('#regenBtn').click( Numbas.controls.regenQuestion );
	else
		$('*').find('#regenBtn').hide();

	if(Numbas.store)
	{
		$('*').find('#pauseBtn').click( Numbas.controls.pauseExam );
	}
	else
	{
		//hide 'pause' button
		$('*').find('#pauseBtn').hide();
	}

	//register 'end exam' button
	$('*').find("#endBtn").click( Numbas.controls.endExam );
}
display.ExamDisplay.prototype = 
{
	e:undefined,	//reference to main exam object

	showTiming: function()
	{
		$('#stopWatch').html(R('timing.time remaining',Numbas.timing.secsToDisplayTime(this.e.timeRemaining)));
	},

	hideTiming: function()
	{
		$('.timeBox').hide();
	},

	showScore: function()
	{
		var exam = this.e;

		if(exam.showActualMark)
		{
			$('.examScore').show();
			var niceNumber = Numbas.math.niceNumber;

			var totalExamScoreDisplay = '';
			if(exam.showTotalMark)
				totalExamScoreDisplay = niceNumber(exam.score)+'/'+niceNumber(exam.mark);
			else
				totalExamScoreDisplay = niceNumber(exam.score);

			$('#examScore').html(totalExamScoreDisplay);
		}
		else
		{
			$('.examScore').hide();
		}
	},

	updateQuestionMenu: function()
	{
		var exam = this.e;
		//highlight current question, unhighlight the rest
		for(var j=0; j<exam.questionList.length; j++)
		{
			var question = exam.questionList[j];
			$(question.display.questionSelector).attr('class',
					(question.visited || exam.navigateBrowse ? 'questionSelector' : 'questionSelector-hidden')+(j==exam.currentQuestion.number ? ' qs-selected' : ''));
		}
		//scroll question list to centre on current question
		if(display.carouselGo)
			display.carouselGo(exam.currentQuestion.number-1,300);
		
		//enable or disable 'previous question' button
		if(exam.currentQuestion.number === 0)
			$('#prevBtn').attr('disabled','true').hide();
		else if(exam.navigateReverse)
			$('#prevBtn').removeAttr('disabled').show();

		//enable or disable 'next question' button
		if( exam.currentQuestion.number == exam.numQuestions-1 )
			$('#nextBtn').attr('disabled','true').hide();
		else
			$('#nextBtn').removeAttr('disabled').show();
	},

	showInfoPage: function(page)
	{
		//hide question container, and show info container
		$('#questionContainer').hide();
		$('#questionDisplay').html('');
		$('#infoDisplay').show();

		var exam = this.e;

		//scroll back to top of screen
		scroll(0,0);

		switch(page)
		{
		case "frontpage":

			//the whole page was hidden at load, so user doesn't see all the nav elements briefly
			$('body > *').show();
			$('#loading').hide();

			$('#infoDisplay').getTransform(Numbas.xml.templates.frontpage,exam.xmlize());

			$('#startBtn').click( Numbas.controls.beginExam );
			break;

		case "result":
			//turn report into XML
			var xmlDoc = Sarissa.xmlize(exam.report,"report");

			//display result page using report XML
			$('#infoDisplay').getTransform(Numbas.xml.templates.result,xmlDoc);
			
			//make exit button 
			$('#exitBtn').click(Numbas.controls.exitExam);	
					
			$('#reviewBtn').hide();
			break;

		case "suspend":
			$('#infoDisplay').getTransform(Numbas.xml.templates.suspend,exam.xmlize());
		
			$('#resumeBtn').click( Numbas.controls.resumeExam );

			Numbas.exam.display.showScore();

			break;
		
		case "exit":
			$('#infoDisplay').getTransform(Numbas.xml.templates.exit,exam.xmlize());
			break;
		}

	},

	showQuestion: function()
	{
		var exam = this.e;

		exam.currentQuestion.display.show();
		if(!this.madeCarousel)
		{
			display.carouselGo = makeCarousel($('.questionList'),{step: 2, nextBtn: '.questionMenu .next', prevBtn: '.questionMenu .prev'});
			this.madeCarousel = true;
		}
	},

	startRegen: function() {
		$('#questionDisplay').hide();
	},
	
	endRegen: function() {
		$('#questionDisplay').fadeIn(200);
	}
};

//display properties of question object
display.QuestionDisplay = function(q)
{
	this.q = q;


	//make question selector for menu
	var qs = $('#questionSelector').clone();

	qs
		.attr('id','questionSelector-'+q.number)
		.find('#name').html((q.number+1)+'. '+q.name);

	$('#questionList').append(qs);
	
	//have to make anonymous functions because of scope - can't just pass in this.number
	function makeJumper(n)
	{
		return function() { Numbas.controls.jumpQuestion(n);};
	}

	qs.click(makeJumper(q.number));

	this.questionSelector = '#questionSelector-'+q.number;
}
display.QuestionDisplay.prototype =
{
	q: undefined,					//reference back to the main question object
	html: '',						//HTML for displaying question
	questionSelector: '',			//jQuery selector for this question's menu entry

	makeHTML: function() {
		//make html for question and advice text
		this.html = $.xsl.transform(Numbas.xml.templates.question, this.q.xml).string;
	},

	show: function()
	{
		var exam = Numbas.exam;
		var q = this.q;

		//hides the info page, if visible
		$('#infoDisplay').hide();

		//display the question container - content and nav bars
		$('#questionContainer').show();
		
		//update the question menu - highlight this question, etc.
		exam.display.updateQuestionMenu();

		//enable the submit button
		$('#submitBtn').removeAttr('disabled');
		//show the reveal button
		$('#revealBtn').show().removeAttr('disabled');

		//display question's html
		
		$('#questionDisplay').html(this.html);

		if($('.statement').text().trim()=='')	//hide statement block if empty
			$('.statement').hide();

		//show parts
		this.postTypesetF = function(){};
		for(var i=0;i<q.parts.length;i++)
		{
			q.parts[i].display.show();
		}

		var submitMsg;
		if(q.parts.length<=1)
		{
			submitMsg = R('control.submit answer');
		}
		else
		{
			submitMsg = R('control.submit all parts');
		}
		$('.navBar #submitBtn').val(submitMsg);

		$('#regenBtn').val(R('control.regen'));

		//update question name box in nav bar
		$('#questionNameDisplay').html((q.number+1)+'. '+q.name);

		//display advice if appropriate
		this.showAdvice();

		//show/hide reveal answer button
		if(exam.allowRevealAnswer)
			$('#revealBtn').show();
		else
			$('#revealBtn').hide();

		//show correct answers if appropriate
		this.revealAnswer();
		
		//display score if appropriate
		this.showScore();
		
		//make input elements report when they get and lose focus
		$('input')	.blur( function(e) { Numbas.display.inInput = false; } )
					.focus( function(e) { Numbas.display.inInput = true; } );

		//resize text inputs to just fit their contents
		$('input[type=text],input[type=number]').keyup(resizeF).keydown(resizeF).change(resizeF).each(resizeF);

		$('input').bind('propertychange',function(){$(this).trigger('input')});

		//scroll back to top of page
		scroll(0,0);


		// make mathjax process the question text (render the maths)
		Numbas.display.typeset($('#questionDisplay'),this.postTypesetF);

	},

	addPostTypesetCallback: function(callback)
	{
		var f = this.postTypesetF;
		this.postTypesetF = function() {
			callback();
			f();
		}
	},

	//display Advice
	showAdvice: function( fromButton )
	{
		if( this.q.adviceDisplayed )
		{
			$('#adviceBtn').attr('disabled','true');

			//if advice text non-empty, show it and typeset maths
			if($.trim($('#adviceDisplay').text()))
			{
				$('#adviceContainer').show();			
				if(fromButton)
				{
					Numbas.display.typeset();
				}
			}else	//otherwise hide the advice box if it's empty
			{
				$('#adviceContainer').hide();
			}
		}
		else
		{
			$('#adviceContainer').hide();
			$('#adviceBtn').removeAttr('disabled');
		}	
	},

	revealAnswer: function()
	{
		if(!this.q.revealed)
			return;

		//disable submit button
		$('#submitBtn').attr('disabled','true');
		//hide reveal button
		$('#revealBtn').hide();

		for(var i=0;i<this.q.parts.length;i++)
		{
			this.q.parts[i].display.revealAnswer();
		}
	},

	//display question score and answer state
	showScore: function()
	{
		var exam = Numbas.exam;
		var q = this.q;

		var selector = $(this.questionSelector).add('.submitDiv');

		showScoreFeedback(selector,q.answered,q.score,q.marks,exam);

		if(!exam.showTotalMark && !exam.showActualMark)
		{
			selector.find('#submitBtn').val(R(q.answered ? 'control.submit again' : 'control.submit'));
		}
		var anyAnswered = false;
		for(var i=0;i<q.parts.length;i++)
		{
			anyAnswered |= q.parts[i].answered;
		}
		if(!anyAnswered)
			$('.submitDiv').find('#feedback,#score').hide();

	},

	scrollToError: function() {
		scrollTo($('.warningcontainer:visible:first'));
	}
};

var extend = Numbas.util.extend;

//display methods for question parts
display.PartDisplay = function(p)
{
	this.p = p;
	this.warningDiv = '#warning-'+p.path;
}
display.PartDisplay.prototype = 
{
	p: undefined,	//reference back to main part object

	warningDiv:'',	//id of div where warning messages are displayed

	warning: function(warning)
	{
		$(this.warningDiv).show().find('.partwarning').append('<span>'+warning.toString()+'</span>');
		Numbas.display.typeset();
	},

	//remove all previously displayed warnings
	removeWarnings: function()
	{
		$(this.warningDiv).hide().find('.partwarning').html('');
	},

	//returns a jquery selector for the HTML div containing this part's things
	htmlContext: function()
	{
		s = $('#questionContainer').find('#'+this.p.path);
		return s;
	},

	answerContext: function()
	{
		return this.htmlContext().find('#answer-'+this.p.path);
	},

	//called when part is displayed (basically when question is changed)
	//show steps if appropriate, restore answers
	show: function()
	{
		var p = this.p;
		var c = this.htmlContext();
		if(p.stepsShown)
		{
			this.showSteps();
		}
		else
		{
			c.find('#stepsBtn:last').click(function() {
				p.showSteps();
			});
		}
		this.restoreAnswer();

		$(this.warningDiv)
			.mouseover(function(){
				$(this).find('.partwarning').show();
			})
			.mouseout(function(){
				$(this).find('.partwarning').hide()
			});

		//hide part submit button and score feedback if there's only one part
		if(p.parentPart==null && p.question.parts.length==1)
		{
			c.find('#partFeedback:last').hide();
		}


		c.find('#partFeedback:last #submitPart').click(function() {
			p.display.removeWarnings();
			p.submit();
			if(!p.answered)
			{
				Numbas.display.showAlert(R('question.can not submit'));
				scrollTo(p.display.htmlContext().find('.warningcontainer:visible:first'));
			}
			Numbas.store.save();
		});

		this.showScore(this.p.answered);
	},

	//update 
	showScore: function(valid)
	{
		var c = this.htmlContext();

		if(this.p.question.revealed)
		{
			showScoreFeedback(c,false,0,this.p.marks,Numbas.exam);
		}
		else if(this.p.marks==0)
		{
			c.find('#partFeedback:last').hide();
		}
		else
		{
			c.find('#marks:last').show();
			if(valid===undefined)
				valid = this.p.validate();
			showScoreFeedback(c,valid,this.p.score,this.p.marks,Numbas.exam);
		}

		if(Numbas.exam.showAnswerState)
		{
			if(this.p.markingFeedback.length && !this.p.question.revealed)
			{
				var feedback = [];
				var maxMarks = this.p.marks - (this.p.stepsShown ? this.p.settings.stepsPenalty : 0);
				var t = 0;
				for(var i=0;i<this.p.markingFeedback.length;i++)
				{
					var action = this.p.markingFeedback[i];
					var change = 0;

					switch(action.op) {
					case 'addCredit':
						change = action.credit*maxMarks;
						if(action.gap!=undefined)
							change *= this.p.gaps[action.gap].marks/this.p.marks;
						t += change;
						break;
					}

					var message = action.message || '';
					if(message.trim().length)
					{
						var marks = R('feedback.marks',Numbas.math.niceNumber(Math.abs(change)),util.pluralise(change,'mark','marks'));

						if(change>0)
							message+='\n\n'+R('feedback.you were awarded',marks);
						else if(change<0)
							message+='\n\n'+R('feedback.taken away',marks,util.pluralise(change,'was','were'));
					}
					if(message.trim().length)
						feedback.push(message);
				}

				feedback = feedback.join('\n\n<hr/>');
				c.find('#feedbackMessage:last').html(feedback).hide().fadeIn(500);
				Numbas.display.typeset(c.find('#feedbackMessage:last'));
			}
			else
			{
				c.find('#feedbackMessage').hide();
			}
		}
		else
		{
			c.find('#feedbackMessage').hide();
		}
	},

	//called when 'show steps' button is pressed, or coming back to a part after steps shown
	showSteps: function()
	{
		var c = this.htmlContext();
		c.find('#steps-'+this.p.path).show();
		c.find('#stepsBtnDiv-'+this.p.path).hide();

		for(var i=0;i<this.p.steps.length;i++)
		{
			this.p.steps[i].display.show();
		}
	},

	//called when question displayed - fills student's last answer into inputs
	restoreAnswer: function() 
	{
		this.answerContext().find('input[type=text]').each(resizeF);
	},

	//fills inputs with correct answers
	revealAnswer: function() 
	{
		var c = this.htmlContext();
		this.removeWarnings();
		c.find('input[type=text],input[type=number]').each(resizeF);
		c.find('#submitPart').attr('disabled',true);
		this.showScore();
	}
};

//JME display code
display.JMEPartDisplay = function()
{
}
display.JMEPartDisplay.prototype =
{
	timer: undefined,		//timer for the live preview
	txt: '',
	oldtxt: '',				//last displayed preview
	oldtex: '',
	hasFocus: false,
	validEntry: true,
	showAnyway: true,

	show: function()
	{
		var pd = this;
		var p = this.p;
		var hc = this.htmlContext();
		var ac = this.answerContext();
		var previewDiv = ac.find('#preview');
		var inputDiv = ac.find('#jme');
		var errorSpan = hc.find('#warning-'+p.path);

		this.hasFocus = false;
		this.validEntry = true;
		this.txt = this.p.studentAnswer; this.oldtxt = '';


		var keyPressed = function()
		{
			pd.inputChanged(inputDiv.val());
		};

		//when student types in input box, update display
		inputDiv.bind('input',function() {
			if(pd.timer!=undefined)
				return;

			clearTimeout(pd.timer);


			pd.timer = setTimeout(keyPressed,100);
		});

		//when input box loses focus, hide it
		inputDiv.blur(function() {
			Numbas.controls.doPart([this.value],p.path);
		});

		this.oldtxt='';
		this.inputChanged(this.p.studentAnswer,true);

		previewDiv.click(function() {
			inputDiv.focus();
		});
	},

	restoreAnswer: function()
	{
		var c = this.answerContext();
		c.find('#jme').val(this.p.studentAnswer);
	},

	revealAnswer: function() 
	{
		var c = this.answerContext();
		c.find('#jme')
			.attr('disabled','true')
			.val(this.p.settings.correctAnswer);
		this.inputChanged(this.p.settings.correctAnswer,true);
		c.find('#preview').css('color','#555')
						  .mouseout();			//for some reason just hiding the input doesn't work, so simulate a mouseout to do the same thing
	},
	
	//display a live preview of the student's answer typeset properly
	inputChanged: function(txt,force)
	{
		this.p.storeAnswer([txt]);
		if((txt!=this.oldtxt && txt!==undefined) || force)
		{
			this.txt = txt;

			this.removeWarnings();
			var ac = this.answerContext();
			var previewDiv = ac.find('#preview');
			var inputDiv = ac.find('#jme');
			var errorSpan = this.htmlContext().find('#warning-'+this.p.path);
			if(txt!=='')
			{
				try {
					var tex = Numbas.jme.display.exprToLaTeX(txt,this.p.settings.displaySimplification,this.p.question.scope);
					if(tex===undefined){throw(new Numbas.Error('display.part.jme.error making maths'))};
					previewDiv.html('$'+tex+'$');
					var pp = this;
					Numbas.display.typeset(previewDiv);
					this.validEntry = true;
					this.oldtex = tex;
				}
				catch(e) {
					this.validEntry = false;
					this.warning(e);
					previewDiv.html('');
				}
			}
			else
			{
				previewDiv.html('');
				this.oldtex='';
				this.validEntry = true;
			}
			this.oldtxt = txt;
		}
		this.timer=undefined;
	}
};
display.JMEPartDisplay = extend(display.PartDisplay,display.JMEPartDisplay,true);

//Pattern Match display code
display.PatternMatchPartDisplay = function()
{
}
display.PatternMatchPartDisplay.prototype = 
{
	show: function()
	{
		var c = this.answerContext();
		var p = this.p;
		c.find('#patternmatch').bind('input',function() {
			p.storeAnswer([$(this).val()]);
		});
	},

	restoreAnswer: function()
	{
		var c = this.answerContext();
		c.find('#patternmatch').val(this.p.studentAnswer);
	},

	revealAnswer: function()
	{
		var c = this.answerContext();
		c.find('#patternmatch')
			.attr('disabled',true)
			.val(this.p.settings.displayAnswer);
	}
};
display.PatternMatchPartDisplay = extend(display.PartDisplay,display.PatternMatchPartDisplay,true);

//Number Entry display code
display.NumberEntryPartDisplay = function()
{
}
display.NumberEntryPartDisplay.prototype =
{
	show: function() {
		var p = this.p;
		this.answerContext().find('#numberentry').bind('input',function(){
			p.storeAnswer([$(this).val()]);
		});
	},

	restoreAnswer: function()
	{
		var c = this.answerContext();
		c.find('#numberentry').val(this.p.studentAnswer);
	},

	revealAnswer: function()
	{
		var c = this.answerContext();
		c.find('#numberentry')
			.attr('disabled','true')
			.val(this.p.settings.displayAnswer);
	}
};
display.NumberEntryPartDisplay = extend(display.PartDisplay,display.NumberEntryPartDisplay,true);


//Multiple Response display code
display.MultipleResponsePartDisplay = function()
{
}
display.MultipleResponsePartDisplay.prototype =
{
	show: function()
	{
		var p = this.p;
		var c = this.htmlContext();

		function makeClicker(choice,answer)
		{
			return function() {
				p.storeAnswer([choice,answer,$(this).prop('checked')]);
			};
		}

		switch(p.settings.displayType)
		{
		case 'dropdownlist':
			c.find('.multiplechoice').bind('change',function() {
				var i = $(this).find('option:selected').index();
				p.storeAnswer([i-1,0]);
			});
			break;
		default:
			for(var i=0; i<p.numAnswers; i++)
			{
				for(var j=0; j<p.numChoices; j++)
				{
					c.find('#choice-'+j+'-'+i).change(makeClicker(i,j));
				}
			}
		}

	},
	restoreAnswer: function()
	{
		var c = this.htmlContext();
		for(var i=0; i<this.p.numChoices; i++)
		{
			for(var j=0; j<this.p.numAnswers; j++)
			{
				var checked = this.p.ticks[j][i];
				c.find('#choice-'+i+'-'+j).prop('checked',checked);
			}
		}
	},

	revealAnswer: function()
	{
		switch(this.p.settings.displayType)
		{
		case 'radiogroup':
		case 'checkbox':
			//tick a response if it has positive marks
			var c = this.answerContext();
			for(var j=0; j<this.p.numAnswers; j++)
			{
				for(var i=0; i<this.p.numChoices; i++)
				{
					var checked = this.p.settings.matrix[j][i]>0;
					c.find('#choice-'+i+'-'+j)
						.attr('disabled',true)
						.prop('checked',checked);
				}
			}
			break;
		case 'dropdownlist':
			var bigscore=0;
			for(var i=0;i<this.p.numAnswers;i++)
			{
				if(this.p.settings.matrix[i][0] > bigscore)
				{
					bigscore = this.p.settings.matrix[i][0];
					$(this.answerContext().find('option')[i]).attr('selected','true');
				}
			}
			break;
		}
	}
};
display.MultipleResponsePartDisplay = extend(display.PartDisplay,display.MultipleResponsePartDisplay,true);


display.GapFillPartDisplay = function()
{
}
display.GapFillPartDisplay.prototype =
{
	show: function()
	{
		for(var i=0;i<this.p.gaps.length; i++)
			this.p.gaps[i].display.show();
	},

	restoreAnswer: function()
	{
		for(var i=0;i<this.p.gaps.length; i++)
			this.p.gaps[i].display.restoreAnswer();
	},

	revealAnswer: function()
	{
		for(var i=0; i<this.p.gaps.length; i++)
			this.p.gaps[i].display.revealAnswer();
	}
};
display.GapFillPartDisplay = extend(display.PartDisplay,display.GapFillPartDisplay,true);

display.InformationPartDisplay = function()
{
}
display.InformationPartDisplay = extend(display.PartDisplay,display.InformationPartDisplay,true);


//get size of contents of an input
//from http://stackoverflow.com/questions/118241/calculate-text-width-with-javascript
$.textMetrics = function(el) {
	var h = 0, w = 0;

	var div = document.createElement('div');
	document.body.appendChild(div);
	$(div).css({
		position: 'absolute',
		left: -1000,
		top: -1000,
		display: 'none'
	});

	var val = $(el).val();
	val = val.replace(/ /g,'&nbsp;');
	$(div).html(val);
	var styles = ['font-size','font-style', 'font-weight', 'font-family','line-height', 'text-transform', 'letter-spacing'];
	$(styles).each(function() {
		var s = this.toString();
		$(div).css(s, $(el).css(s));
	});

	h = $(div).outerHeight();
	w = $(div).outerWidth();

	$(div).remove();

	var ret = {
	 height: h,
	 width: w
	};

	return ret;
}

function resizeF() {
	var w = $.textMetrics(this).width;
	$(this).width(Math.max(w+30,60)+'px');
};

//update a score feedback box
//selector - jQuery selector of element to update
//score - student's score
//marks - total marks available
//settings - object containing the following properties:
//	showTotalMark
//	showActualMark
//	showAnswerState
function showScoreFeedback(selector,answered,score,marks,settings)
{
	var niceNumber = Numbas.math.niceNumber;
	var scoreDisplay = '';

	answered = answered || score>0;

	var scoreSelector = selector.find('#score:last');

	var scoreobj = {
		marks: niceNumber(marks),
		score: niceNumber(score),
		marksString: niceNumber(marks)+' '+util.pluralise(marks,'mark','marks'),
		scoreString: niceNumber(marks)+' '+util.pluralise(marks,'mark','marks')
	};
	if(answered)
	{
		var str = 'question.score feedback.answered'
					+ (settings.showTotalMark ? ' total' : '')
					+ (settings.showActualMark ? ' actual' : '')
		scoreSelector
			.show()
			.html(R(str,scoreobj));
	}
	else
	{
		if(settings.showTotalMark)
		{
			scoreSelector
				.show()
				.html(R('question.score feedback.unanswered total',scoreobj));
		}
		else
			scoreSelector.hide();
	}
/*
	if(settings.showTotalMark || settings.showActualMark)
	{
		if(answered)
		{
			if(!settings.showTotalMark && settings.showActualMark)
				scoreDisplay = niceNumber(score);
			else if(settings.showTotalMark && !settings.showActualMark)
				scoreDisplay = 'Answered ('+niceNumber(marks)+')';
			else if(settings.showTotalMark && settings.showActualMark)
				scoreDisplay = niceNumber(score)+'/'+niceNumber(marks);

			scoreSelector
				.show()
				.html(scoreDisplay);
		}
		else
		{
			if(settings.showTotalMark)
			{
				scoreDisplay = niceNumber(marks)+' '+(marks==1 ? 'mark' : 'marks');
				scoreSelector
					.show()
					.html(scoreDisplay);
			}
			else
				scoreSelector.hide();

		}

	}
	else
	{
		if(answered)
		{
			scoreSelector
				.show()
				.html('Answered');
		}
		else
			scoreSelector.hide();
	}
*/

	if( settings.showAnswerState )
	{
		if( answered )
		{
			var state;
			if( score<=0  )
			{
				state = 'cross';
			}
			else if( score == marks )
			{
				state = 'tick';
			}		
			else
			{
				state = 'partial';
			}
			selector.find('#feedback:last')
				.show()
				.attr('class',state)
			;
		}
		else
		{
			selector.find('#feedback:last').attr('class','').hide();
		}
	}
	else
	{
		selector.find('#feedback:last').hide();
	}	

	selector.find('#marks:last').each(function(){
		if(!$(this).is(':animated'))
			$(this).fadeOut(200).fadeIn(200);
	});

};

function scrollTo(el)
{
	if(!(el).length)
		return;
	var docTop = $(window).scrollTop();
	var docBottom = docTop + $(window).height();
	var elemTop = $(el).offset().top;
	if((elemTop-docTop < 50) || (elemTop>docBottom-50))
		$('html,body').animate({scrollTop: $(el).offset().top-50 });
}

//make a carousel out of a div containing a list
var makeCarousel = Numbas.display.makeCarousel = function(elem,options) {
	options = $.extend({
		prevBtn: null,
		nextBtn: null,
		speed: 200,
		step: 1
	}, options || {});

	var div = $(elem);
	var current = div.find('li:first');
	var going = false;
	var nextScroll = null;

	function scrollTo(i)
	{
		nextScroll = i;
		if(going)
			return;
		var listOffset = div.find('ul,ol').position().top;
		var listHeight = div.find('ul,ol').height();

		var lis = div.find('li');
		var divHeight = div.height();
		var maxI = 0;
		for(var j=0;j<lis.length;j++)
		{
			var y = lis.eq(j).position().top - listOffset;
			if(listHeight - y < divHeight)
			{
				maxI = j;
				break;
			}
		}
		i = Math.max(Math.min(i,maxI),0);

		var ocurrent = current;
		current = div.find('li').eq(i);
		var itemOffset = current.position().top - listOffset;
		if(itemOffset != div.scrollTop() && ocurrent != current)
		{
			going = true;
			nextScroll = null;
			div.animate({scrollTop: itemOffset},{
				duration: options.speed,
				complete: function() { 
					going = false;
					if(nextScroll != null)
						scrollTo(nextScroll);
				} 
			});
		}
	}

	function scrollUp() {
		var i = div.find('li').index(current) || 0;
		if(nextScroll!==null)
			i = Math.min(i,nextScroll);
		i = Math.max(i-options.step, 0);
		scrollTo(i);
	}
	function scrollDown() {
		var lis = div.find('li');
		var i = lis.index(current) || 0;
		if(nextScroll!==null)
			i = Math.max(i,nextScroll);
		i = Math.min(i+options.step,lis.length-1);
		scrollTo(i);
	}

	$(options.prevBtn).click(scrollUp);
	$(options.nextBtn).click(scrollDown);
	div.mousewheel(function(e,d) {
		d > 0 ? scrollUp() : scrollDown();
		return false;
	});

	return scrollTo;
};


});
