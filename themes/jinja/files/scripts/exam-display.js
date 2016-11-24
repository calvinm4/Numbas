Numbas.queueScript('exam-display',['display-base','math','util','timing'],function() {
    var display = Numbas.display;
    var util = Numbas.util;

    /** Display properties of the {@link Numbas.Exam} object.
     * @name ExamDisplay
     * @memberof Numbas.display
     * @constructor
     * @param {Numbas.Exam} e - associated exam
     * 
     */
    display.ExamDisplay = function(e) 
    {
        this.exam=e;

        /** The exam's mode ({@link Numbas.Exam#mode})
         * @member {observable|string} mode
         * @memberof Numbas.display.ExamDisplay
         */
        this.mode = ko.observable(e.mode);
        
        /** Is {@link Numbas.store} currently saving?
         * @member {observable|boolean} saving
         * @memberof Numbas.display.ExamDisplay
         */
        this.saving = ko.observable(false);

        /** The name of the currently displayed info page
         * @member {observable|string} infoPage
         * @memberof Numbas.display.ExamDisplay
         */
        this.infoPage = ko.observable(null);

        /** The current question ({@link Numbas.Exam#currentQuestion})
         * @member {observable|Numbas.Question} currentQuestion
         * @memberof Numbas.display.ExamDisplay
         */
        this.currentQuestion = ko.observable(null);

        /** What kind of view are we in at the moment? 'infopage' or 'question'
         * @member {observable|string} viewType
         * @memberof Numbas.display.ExamDisplay
         */
        this.viewType = ko.computed(function() {
            if(this.infoPage()) {
                return 'infopage';
            } else if(this.currentQuestion()) {
                return 'question';
            }
        },this);

        /** The number of the current question
         * @member {observable|number} currentQuestionNumber 
         * @memberof Numbas.display.ExamDisplay
         */
        this.currentQuestionNumber = ko.computed(function() {
            var q = this.currentQuestion();
            if(q)
                return q.question.number;
            else
                return null;
        },this);

        /** All the exam's question display objects
         * @member {observable|Numbas.display.QuestionDisplay[]} questions
         * @memberof Numbas.display.ExamDisplay
         */
        this.questions = ko.observableArray([]);

        /** Can the student go back to the previous question? (False if the current question is the first one
         * @member {observable|boolean} canReverse
         * @memberof Numbas.display.ExamDisplay
         */
        this.canReverse = ko.computed(function() {
            return this.exam.settings.navigateReverse && this.currentQuestionNumber()>0;
        },this);
        
        /** Can the student go forward to the next question? (False if the current question is the last one)
         * @member {observable|boolean} canAdvance
         * @memberof Numbas.display.ExamDisplay
         */
        this.canAdvance = ko.computed(function() {
            return this.currentQuestionNumber()<this.exam.settings.numQuestions-1;
        },this);

        /** The student's total score ({@link Numbas.Exam#score})
         * @member {observable|number} score
         * @memberof Numbas.display.ExamDisplay
         */
        this.score = ko.observable(e.score);

        /** The total marks available for the exam ({@link Numbas.Exam#mark})
         * @member {observable|number} marks
         * @memberof Numbas.display.ExamDisplay
         */
        this.marks = ko.observable(e.mark);

        /** The percentage score the student needs to achieve to pass ({@link Numbas.Exam#percentPass}), formatted as a string.
         * @member {observable|string} percentPass
         * @memberof Numbas.display.ExamDisplay
         */
        this.percentPass = ko.observable(e.settings.percentPass*100+'%');

        /** String displaying the student's current score, and the total marks available, if allowed
         * @member {observable|string} examScoreDisplay
         * @memberof Numbas.display.ExamDisplay
         */
        this.examScoreDisplay = ko.computed(function() {
            var niceNumber = Numbas.math.niceNumber;
            var exam = this.exam;
            var score = this.score();
            var marks = this.marks();

            var totalExamScoreDisplay = '';
            if(exam.settings.showTotalMark)
                totalExamScoreDisplay = niceNumber(score)+'/'+niceNumber(marks);
            else
                totalExamScoreDisplay = niceNumber(score);

            return totalExamScoreDisplay;
        },this);

        /** The student's total score as a percentage of the total marks available
         * @member {observable|number} percentScore
         * @memberof Numbas.display.ExamDisplay
         */
        this.percentScore = ko.observable(0);

        /** The time left in the exam
         * @member {observable|string} displayTime
         * @memberof Numbas.display.ExamDisplay
         */
        this.displayTime = ko.observable('');

        /** Show the names of question groups in the menu?
         * @member {observable|string} showQuestionGroupNames
         * @memberof Numbas.display.ExamDisplay
         */
        this.showQuestionGroupNames = ko.observable(e.settings.showQuestionGroupNames);

        /** Time the exam started, formatted for display
         * @mamber {observable|string} startTime
         * @memberof Numbas.display.ExamDisplay
         */
        var _startTime = ko.observable();
        this.startTime = ko.computed({
            read: function() {
                var t = _startTime();
                if(t) {
                    return util.formatTime(new Date(t));
                } else {
                    return '';
                }
            },
            write: function(v) {
                return _startTime(v);
            }
        });

        /** Time the exam ended, formatted for display
         * @mamber {observable|string} endTime
         * @memberof Numbas.display.ExamDisplay
         */
        var _endTime = ko.observable();
        this.endTime = ko.computed({
            read: function() {
                var t = _endTime();
                if(t) {
                    return util.formatTime(new Date(t));
                } else {
                    return '';
                }
            },
            write: function(v) {
                return _endTime(v);
            }
        });

        /** The total time the student has spent in the exam
         * @member {observable|string} timeSpent
         * @memberof Numbas.display.ExamDisplay
         */
        this.timeSpent = ko.observable('');

        /** Is the student allowed to pause the exam?
         * @member {boolean} allowPause
         * @memberof Numbas.display.ExamDisplay
         */
        this.allowPause = e.settings.allowPause;

        /** Total number of questions the student attempted
         * @member {observable|number} questionsAttempted
         * @memberof Numbas.display.ExamDisplay
         */
        this.questionsAttempted = ko.computed(function() {
            return this.questions().reduce(function(s,q) { 
                return s + (q.answered() ? 1 : 0); 
            },0);
        },this);

        /** Total number of questions the student attempted, formatted as a fraction of the total number of questions
         * @member {observable|string} questionsAttemptedDisplay
         * @memberof Numbas.display.ExamDisplay
         */
        this.questionsAttemptedDisplay = ko.computed(function() {
            return this.questionsAttempted()+' / '+this.exam.settings.numQuestions;
        },this);

        /** The result of the exam - passed or failed?
         * @member {observable|string} result
         * @memberof Numbas.display.ExamDisplay
         */
        this.result = ko.observable('');

        /** Did the student pass the exam?
         * @member {observable|boolean} passed
         * @memberof Numbas.display.ExamDisplay
         */
        this.passed = ko.observable(false);

        /** Message shown to the student based on their total score
         * @member {observable|string} feedbackMessage
         * @memberof Numbas.display.ExamDisplay
         */
        this.feedbackMessage = ko.observable(null);

        document.title = e.settings.name;

    }
    display.ExamDisplay.prototype = /** @lends Numbas.display.ExamDisplay.prototype */
    {
        /** Reference to the associated exam object
         * @type {Numbas.Exam}
         * @memberof Numbas.display.ExamDisplay
         */
        exam: undefined,

        /** Update the timer 
         * @memberof Numbas.display.ExamDisplay
         */
        showTiming: function()
        {
            this.displayTime(Numbas.timing.secsToDisplayTime(this.exam.timeRemaining));
            this.timeSpent(Numbas.timing.secsToDisplayTime(this.exam.timeSpent));
        },

        /** Initialise the question list display 
         * @memberof Numbas.display.ExamDisplay
         */
        initQuestionList: function() {
            this.question_groups = this.exam.question_groups.map(function(g) {
                return {
                    name: g.settings.name,
                    group: g,
                    questions: g.questionList.map(function(q){return q.display})
                }
            });
            for(var i=0; i<this.exam.questionList.length; i++) {
                this.questions.push(this.exam.questionList[i].display);
            }
        },

        /** Hide the timer 
         * @memberof Numbas.display.ExamDisplay
         */
        hideTiming: function()
        {
            this.displayTime('');
        },

        /** Show/update the student's total score 
         * @memberof Numbas.display.ExamDisplay
         */
        showScore: function()
        {
            var exam = this.exam;
            this.marks(Numbas.math.niceNumber(exam.mark));
            this.score(Numbas.math.niceNumber(exam.score));
            this.percentScore(exam.percentScore);
        },

        /** Update the question list display - typically, scroll so the current question is visible 
         * @memberof Numbas.display.ExamDisplay
         */
        updateQuestionMenu: function()
        {
            var exam = this.exam;
            //scroll question list to centre on current question
            if(display.carouselGo)
                display.carouselGo(exam.currentQuestion.number-1,300);
        },

        /** Show an info page (one of the front page, pause , results, or exit)
         * @param {string} page - name of the page to show
         * @memberof Numbas.display.ExamDisplay
         */
        showInfoPage: function(page)
        {
            window.onbeforeunload = null;

            this.infoPage(page);
            this.currentQuestion(null);

            var exam = this.exam;

            //scroll back to top of screen
            scroll(0,0);

            switch(page)
            {
            case "frontpage":
                this.marks(exam.mark);

                break;

            case "result":
                this.result(exam.result);
                this.passed(exam.passed);
                this.feedbackMessage(exam.feedbackMessage);
                this.startTime(exam.start);
                this.endTime(exam.stop);
                
                break;

            case "suspend":
                this.showScore();

                break;
            
            case "exit":
                break;
            }
            this.hideNavMenu();
        },

        /** Show the current question 
         * @memberof Numbas.display.ExamDisplay
         */
        showQuestion: function()
        {
            var exam = this.exam;

            this.infoPage(null);
            this.currentQuestion(exam.currentQuestion.display);

            if(exam.settings.preventLeave && this.mode() != 'review')
                window.onbeforeunload = function() { return R('control.confirm leave') };
            else
                window.onbeforeunload = null;

            exam.currentQuestion.display.show();
            if(!this.madeCarousel)
            {
                display.carouselGo = makeCarousel($('.questionList'),{step: 2, nextBtn: '.questionMenu .next', prevBtn: '.questionMenu .prev'});
                this.madeCarousel = true;
            }
            this.hideNavMenu();
        },

        /** Hide the sliding side menu
         * @memberof Numbas.display.ExamDisplay
         */
        hideNavMenu: function() {
            if($('#navMenu').data('bs.offcanvas')) {
                $('#navMenu').offcanvas('hide');
            }
        },

        /** Called just before the current question is regenerated 
         * @memberof Numbas.display.ExamDisplay
         */
        startRegen: function() {
            $('#questionDisplay').hide();
            this.exam.currentQuestion.display.html.remove();
            this.oldQuestion = this.exam.currentQuestion.display;
        },
        
        /** Called after the current question has been regenerated 
         * @memberof Numbas.display.ExamDisplay
         */
        endRegen: function() {
            var currentQuestion = this.exam.currentQuestion;
            this.questions.splice(currentQuestion.number,1,currentQuestion.display);
            this.applyQuestionBindings(currentQuestion);
            $('#questionDisplay').fadeIn(200);
        },

        /** Apply knockout bindings to the given question
         * @param {Numbas.Question}
         * @memberof Numbas.display.ExamDisplay
         */
        applyQuestionBindings: function(question) {
            ko.applyBindings({exam: this, question: question.display},question.display.html[0]);
        },

        /** Called when the exam ends 
         * @memberof Numbas.display.ExamDisplay
         */
        end: function() {
            this.mode(this.exam.mode);
            this.questions().map(function(q) {
                q.end();
            });
        }
    };

    /** Make a carousel out of a div containing a list
     * @param {Element} elem - div containing list to turn into a carousel
     * @param {object} options -`prevBtn`, `nextBtn` - selectors of buttons to move up and down, `speed`, `step`
     */
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
            try {
                var listOffset = div.find('ul,ol').position().top;
                var listHeight = div.find('ul,ol').height();
            } catch(e) {
                return;
            }

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
