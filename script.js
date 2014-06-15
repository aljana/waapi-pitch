(function () {
   
    var AudioBufferWrapper = function(name, buffer, context) {
        this.name = name;
        this.frame = null
        this.analyser = context.createAnalyser();
        this.analyser.fftSize = 2048; // Velikost FFT, pasovi so fftSize/2
        this.createBufferSource(buffer, context);
    }
    
    AudioBufferWrapper.prototype.createBufferSource = function(buffer, context) {
        this.source = context.createBufferSource();
        this.source.buffer = buffer;
        this.source.connect(context.destination);
        this.source.connect(this.analyser);
        this.source.playbackRate.value = $(".pitch option:selected").val();
    }
    
    AudioBufferWrapper.prototype.play = function(context) {
        if (this.source.playbackState == this.source.PLAYING_STATE) {
            this.source.stop(0);
        } else {
            this.createBufferSource(this.source.buffer, context); 
            this.source.start(context.currentTime);
        }
    }

    AudioBufferWrapper.prototype.FFT = function(context) {
        var _this = this;

        $("button").attr("disabled", "disabled");
        
        _this.createBufferSource(_this.source.buffer, context); 
        
	// Ponastavi note
        $(".notes-fft").html('');
        $(".note-fft").html('');
	
	
        var fft = setInterval(function () {
            _this.fftRun = true;
            
            _this.source.start(context.currentTime);
            _this.analyser.fftSize = 2048;

            var freqBuffer = new Uint8Array(_this.analyser.frequencyBinCount);
            _this.analyser.getByteFrequencyData(freqBuffer);

            // Iskanje pasa z najvisjo amplitudo
            var max = freqBuffer[0];
            var maxIndex = -1;

            for (var i = 1; i < freqBuffer.length; i++) {
                if (freqBuffer[i] > max) {
                    maxIndex = i;
                    max = freqBuffer[i];
                }
            }

            if (maxIndex >= 0) {
                var frequency = ((context.sampleRate/2) / _this.analyser.frequencyBinCount) * maxIndex;
                var note = _this.frequencyToNote(frequency);
                if ($(".note-fft").html() != note) {
                    $(".notes-fft").html($(".notes-fft").html() + " " + note);   
                    $(".note-fft").html(note);
                }
            }

	    // Ustavi iskanje, ko se preneha predvajanje zvoka
            if (_this.source.playbackState == _this.source.FINISHED_STATE) {
                // Reset sound so that it can be played again
                _this.createBufferSource(_this.source.buffer, context); 
                clearInterval(fft);

                 $("button").removeAttr("disabled");
                _this.fftRun = false;
            }
        }, 20);

    }
    AudioBufferWrapper.prototype.autoCorrelation = function(context) {
        var _this = this;
        
        $("button").attr("disabled", "disabled");

        _this.createBufferSource(_this.source.buffer, context); 
        
        $(".notes-acorr").html('');
        $(".note-acorr").html('');
        
        var autocorr = setInterval(function () {
            _this.source.start(context.currentTime);

            var buffer = new Uint8Array(2048);
             _this.analyser.getByteTimeDomainData(buffer);

            if (buffer[0] < 126) { // workaround, todo

                var temp = {};
                for (var j = 1; j < 1024; j++) {
                    var correlation = 0;

                    for (var i = 0; i < 1024; i++) {
                        var val1 = (buffer[i] - 128); 
                        var val2 = (buffer[i+j] - 128); 
                        correlation += val1 * val2; 
                    }

                    var note = _this.frequencyToNote(context.sampleRate / j);
                    if (!(note in temp)) {
                        temp[note] = 0;
                    }
                    if (correlation) {
                        temp[note] += correlation;
                    }

                }

                var max = 0;
                var note;

                Object.keys(temp).forEach(function(key){
                    if (temp[key] > max) {
                        max = temp[key];
                        note = key;
                    }

                });

                if ($(".note-acorr").html() != note) {
                    $(".notes-acorr").html($(".notes-acorr").html() + " " + note);   
                    $(".note-acorr").html(note);
                }                
            }


             if (_this.source.playbackState == _this.source.FINISHED_STATE) {

                 clearInterval(autocorr);
                _this.createBufferSource(_this.source.buffer, context); 
                 $("button").removeAttr("disabled");
                 
            }
            
        }, 20);
        

    }

    // http://osdir.com/ml/audio.emagic.logic.off-topic/2000-09/msg00012.html
    AudioBufferWrapper.prototype.frequencyToNote = function(frequency) {
        var notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        var index = (69 + Math.round( 12 * (Math.log( frequency / 440 )/Math.log(2) ) )) % 12;
        return notes[index];
    }

    var WebAudio = function() {
        this.init();
        this.buffers = {"test":null};
    }
    
    WebAudio.prototype.init = function() {
        var context = (
            window.AudioContext || 
            window.webkitAudioContext || 
            window.mozAudioContext || 
            window.oAudioContext || 
            window.msAudioContext
        );
        
        if (context) {
            this.context = new context();
        } else {
            alert("Web Audio Api not supported in this browser!");
        }
    };
    
    
    WebAudio.prototype.playBuffer = function(bufferId) {
      if (!this.buffers[bufferId]) alert("Error: no file loaded!");
      this.buffers[bufferId].play(this.context);
    }
    
    WebAudio.prototype.autoCorrelation = function(bufferId) {
        if (!this.buffers[bufferId]) alert("Error: no file loaded!");
        this.buffers[bufferId].autoCorrelation(this.context);
    }    
    
    
    WebAudio.prototype.FFT = function(bufferId) {
        if (!this.buffers[bufferId]) alert("Error: no file loaded!");
        this.buffers[bufferId].FFT(this.context);
    }   
    
    
    /*
    WebAudio.prototype.loadFiles = function(successCallback) {
        var _this = this;
        
        var request = new XMLHttpRequest();
        request.open("GET", "files/sinus1.wav", true);
        request.responseType = "arraybuffer";
        request.onload = function () {
            _this.context.decodeAudioData(request.response, function(buffer) {
                _this.buffers["test"] = new AudioBufferWrapper("test", buffer, _this.context);
                successCallback("test");
            });
        }
        
        request.send();
    }
    */
    

 
    var audio = new WebAudio(); 

    fileInput.addEventListener("change", function() {
        var reader = new FileReader();
        reader.onload = function(ev) {
            audio.context.decodeAudioData(ev.target.result, function(buffer) {
                audio.buffers["test"] = new AudioBufferWrapper("test", buffer, audio.context);
            });
        };

        reader.readAsArrayBuffer(this.files[0]);
    }, false);
    

  
    $(document).on("click", ".play", function (e) {
        var bufferId = $(".element").data("key");
        audio.playBuffer(bufferId);             
    });
    
    $(document).on("click", ".autocorrelation", function (e) {
        var bufferId = $(".element").data("key");
        audio.autoCorrelation(bufferId);             
    });
    
    $(document).on("click", ".fft", function (e) {
        var bufferId = $(".element").data("key");
        audio.FFT(bufferId);             
    });
    
    
}());