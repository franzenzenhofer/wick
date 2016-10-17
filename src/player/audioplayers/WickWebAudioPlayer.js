/* Wick - (c) 2016 Zach Rispoli, Luca Damasco, and Josh Rispoli */

var audioContext;
    var readyToStartWebAudioContext;

var WickWebAudioPlayer = function (project) {
    var that = this; 

    this.loadAudio = function(wickObj) {
        if(wickObj.audioData) {
            var rawData = wickObj.audioData.split(",")[1]; // cut off extra filetype/etc data
            var rawBuffer = Base64ArrayBuffer.decode(rawData);
            //wickObj.audioBuffer = rawBuffer;
            audioContext.decodeAudioData(rawBuffer, function (buffer) {
                if (!buffer) {
                    console.error("failed to decode:", "buffer null");
                    return;
                }
                wickObj.audioBuffer = buffer
                wickObj.playSound = function () {
                    that.playSound(wickObj.id, wickObj.audioBuffer, wickObj.loopSound);
                }
                wickObj.stopSound = function () {
                    that.stopSound(wickObj.id, wickObj.audioBuffer, wickObj.loopSound);
                }
            }, function (error) {
                console.error("failed to decode:", error);
            });
        }

        if(wickObj.isSymbol) {
            wickObj.getAllChildObjects().forEach(function(subObj) {
                that.loadAudio(subObj);
            });
        }
    }

    this.setup = function() {
        
        var AudioContext = window.AudioContext // Default
                        || window.webkitAudioContext // Safari and old versions of Chrome
                        || false;
        audioContext = new AudioContext();

        if(!audioContext) {
            alert("WebAudio not supported! Sounds will not play.");
            return;
        }

        // Setup dummy node and discard it to get webaudio context running
        if(audioContext.createGainNode) {
            audioContext.createGainNode();
        } else {
            audioContext.createGain();
        }

        //if(!mobileMode) {
            //loadAudio(project.rootObject);
        //}

        this.loadAudio(project.rootObject)

    }

    this.update = function() {
        
    }

    var allPlayingSounds = [];

    this.playSound = function (wickObjID, buffer, loop) {
        if(!project.muted) {
            var source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.loop = loop;
            source.start(0);
            allPlayingSounds.push({source:source, id:wickObjID});
            console.log("started...");
        }
    }

    this.stopSound = function (wickObjID) {
        allPlayingSounds.forEach(function (sound) {
            if(sound.id === wickObjID) {
                sound.source.stop();
            }
        })
    }

    this.stopAllSounds = function () {
        allPlayingSounds.forEach(function (sound) {
            sound.source.stop();
        })
    }

    this.cleanup = function() {
        audioContext.close();
    }

    
};




