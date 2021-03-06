/* Wick - (c) 2016 Zach Rispoli, Luca Damasco, and Josh Rispoli */

/*************************
     Constructors
*************************/

var WickObject = function () {

// Internals

    // Unique ID. Must never change after object is first created.
    this.id = null;

    // Identifier
    this.name = undefined;

// Positioning

    this.x = 0;
    this.y = 0;
    this.width = undefined;
    this.height = undefined;
    this.scaleX = 1;
    this.scaleY = 1;
    this.angle = 0;
    this.flipX = false;
    this.flipY = false;
    this.opacity = 1;

    this.tweens = [];

// Common

    // Dictionary mapping function names to WickScript object
    this.wickScripts = {
        "onLoad" : "",
        "onClick" : "",
        "onUpdate": "",
        "onKeyDown": ""
    };

// Static

    // Data, only used by static objects
    this.imageData = undefined;
    this.fontData  = undefined;
    this.svgData   = undefined;
    this.audioData = undefined;

// Symbols

    // Player vars, only ever used when in the player.
    this.isPlaying = undefined;
    this.hoveredOver = undefined;
    this.justEnteredFrame = undefined;
    this.onNewFrame = undefined;
    this.onLoadScriptRan = undefined;
    this.deleted = undefined;

    // See design docs for how objects and symbols work.
    this.isSymbol = false;

    // Used to keep track of what frame is being edited
    this.playheadPosition = null;
    this.currentLayer = null;

    // List of layers, only used by symbols
    this.layers = undefined;

};

WickObject.fromJSONFile = function (file, callback) {
    callback(WickObject.fromJSONString(file));
}

WickObject.fromJSONString = function (jsonString) {
    // Parse JSON
    var newWickObject = JSON.parse(jsonString);

    // Put prototypes back on object ('class methods'), they don't get JSONified on project export.
    WickObject.addPrototypes(newWickObject);

    // Decode scripts back to human-readble and eval()-able format
    newWickObject.decodeStrings();

    return newWickObject;
}

WickObject.fromJSONArray = function (jsonArrayObject, callback) {
    var newWickObjects = [];

    var wickObjectJSONArray = jsonArrayObject.wickObjectArray;
    for (var i = 0; i < wickObjectJSONArray.length; i++) {
        
        var newWickObject = WickObject.fromJSONString(wickObjectJSONArray[i]);
        
        if(wickObjectJSONArray.length > 1) {
            newWickObject.x += jsonArrayObject.groupPosition.x;
            newWickObject.y += jsonArrayObject.groupPosition.y;
        }

        newWickObjects.push(newWickObject);
    }

    callback(newWickObjects);
}

WickObject.fromImage = function (imgSrc, callback) {

    var img = new Image();
    img.onload = function() {
        AddPaddingToImage(img, function (paddedImgSrc) {
            var paddedImg = new Image();
            paddedImg.onload = function() {
                var obj = new WickObject();

                obj.width = paddedImg.width;
                obj.height = paddedImg.height;
                obj.imageData = paddedImg.src;

                callback(obj);
            }
            paddedImg.src = paddedImgSrc;
        })
    }
    img.src = imgSrc;

    /*var obj = new WickObject();
    obj.imageData = imgSrc;
    callback(obj);*/

}

WickObject.fromSVG = function (svgData) {
    var svgWickObject = new WickObject();

    svgWickObject.svgData = {};
    svgWickObject.svgData.svgString = svgData.svgString;
    svgWickObject.svgData.fillColor = svgData.fillColor;

    return svgWickObject;
}

WickObject.fromText = function (text) {
    var obj = new WickObject();

    obj.fontData = {
        //backgroundColor: undefined,
        //borderColor: undefined,
        //borderDashArray: undefined,
        //borderScaleFactor: undefined,
        //caching: true,
        cursorColor: '#333',
        cursorDelay: 500,
        //cursorWidth: 2,
        editable: true,
        //editingBorderColor: '#333',
        fontFamily: 'arial',
        fontSize: 40,
        fontStyle: 'normal',
        fontWeight: 'normal',
        //textDecoration: '',
        //hasBorders: true,
        lineHeight: 1.16,
        fill: '#000000',
        //selectionColor: undefined,
        //selectionEnd: undefined,
        //selectionStart: undefined,
        //shadow: undefined,
        //stateProperties: undefined,
        //stroke: undefined,
        //styles: undefined, // Stores variable character styles
        textAlign: 'left',
        //textBackgroundColor: undefined,
        textDecoration: "",
        text: text
    };

    return obj;
}

WickObject.fromAudioFile = function (audioData, callback) {
    var audioWickObject = new WickObject();

    audioWickObject.audioData = audioData;
    audioWickObject.autoplaySound = true;
    audioWickObject.loopSound = false;
    audioWickObject.width = 75;
    audioWickObject.height = 75;

    callback(audioWickObject);
}

WickObject.fromWavFile = function (audioData, callback) {
    WickObject.fromAudioFile(audioData, function (audioWickObject) {
        console.log(audioWickObject.audioData.length)
        audioWickObject.audioData = LZString.compressToBase64(audioWickObject.audioData);
        console.log(audioWickObject.audioData.length)
        audioWickObject.compressed = true;
        callback(audioWickObject);
    });
}

WickObject.createNewSymbol = function () {

    var symbol = new WickObject();

    symbol.isSymbol = true;
    symbol.playheadPosition = 0;
    symbol.currentLayer = 0;
    symbol.layers = [new WickLayer()];

    return symbol;

}

WickObject.createSymbolFromWickObjects = function (wickObjects) {

    // Create a new symbol and add every object in wickObjects as children

    var symbol = WickObject.createNewSymbol();

    for(var i = 0; i < wickObjects.length; i++) {
        var ii = wickObjects.length-1-i; // So objects are properly ordered in symbol

        symbol.layers[0].frames[0].wickObjects[ii] = wickObjects[i];

        symbol.layers[0].frames[0].wickObjects[ii].x = wickObjects[i].x - symbol.x;
        symbol.layers[0].frames[0].wickObjects[ii].y = wickObjects[i].y - symbol.y;
    }

    symbol.width  = symbol.layers[0].frames[0].wickObjects[0].width;
    symbol.height = symbol.layers[0].frames[0].wickObjects[0].height;

    return symbol;

}

/*************************
     Timeline Control
*************************/

WickObject.prototype.getCurrentFrame = function() {
    return this.getFrameAtPlayheadPosition(this.playheadPosition);
}

WickObject.prototype.getPrevFrame = function() {
    return this.getFrameAtPlayheadPosition(this.playheadPosition-1);
}

WickObject.prototype.getNextFrame = function() {
    return this.getFrameAtPlayheadPosition(this.playheadPosition+1);
}

WickObject.prototype.getCurrentLayer = function() {
    return this.layers[this.currentLayer];
}

WickObject.prototype.addLayer = function (layer) {
    this.layers.push(layer);
}

WickObject.prototype.removeLayer = function (layer) {
    var that = this;
    this.layers.forEach(function (currLayer) {
        if(layer === currLayer) {
            that.layers.splice(that.layers.indexOf(layer), 1);
        }
    });
}

WickObject.prototype.getFrameByIdentifier = function (id) {

    var foundFrame = null;

    this.layers.forEach(function (layer) {
        layer.frames.forEach(function (frame) {
            if(frame.identifier === id) {
                foundFrame = frame;
            }
        });
    });

    return foundFrame;

}

// If the frame's length > 1, always return the playhead position of at the frame's beginning
WickObject.prototype.getPlayheadPositionAtFrame = function (frame) {

    var playheadPositionAtFrame = null;
    var frameCounter = 0;

    this.layers.forEach(function (l) {
        frameCounter = 0;
        l.frames.forEach(function (f) {
            if(f === frame) {
                playheadPositionAtFrame = frameCounter;
            }
            frameCounter += f.frameLength;
        });
    });

    return playheadPositionAtFrame;

}

WickObject.prototype.getRelativePlayheadPosition = function (wickObj, args) {
    var frame = this.getFrameWithChild(wickObj);
    var frameStartPlayheadPosition = this.getPlayheadPositionAtFrame(frame);
    var playheadRelativePosition = this.playheadPosition - frameStartPlayheadPosition;

    if(args && args.normalized) playheadRelativePosition /= frame.frameLength-1;

    return playheadRelativePosition;
}

WickObject.prototype.getFrameAtPlayheadPosition = function(pos, args) {
    var layer;
    if(args && args.layerToSearch) {
        layer = args.layerToSearch;
    } else {
        layer = this.getCurrentLayer();
    }

    var counter = 0;

    for(var f = 0; f < layer.frames.length; f++) {
        var frame = layer.frames[f];
        for(var i = 0; i < frame.frameLength; i++) {
            if(counter == pos) {
                return frame;
            }
            counter++;
        }
    }

    // Playhead isn't over a frame on the current layer.
    return null;
}

WickObject.prototype.getTotalTimelineLength = function () {
    var longestLayerLength = 0;

    this.layers.forEach(function (layer) {
        var layerLength = layer.getTotalLength();
        if(layerLength > longestLayerLength) {
            longestLayerLength = layerLength;
        }
    });

    return longestLayerLength;

}

/*************************
     Children utils
*************************/

/* Return all child objects of a parent object (and their children) */
WickObject.prototype.getAllChildObjectsRecursive = function () {

    if (!this.isSymbol) {
        return [];
    }

    var children = [];
    for(var l = this.layers.length-1; l >= 0; l--) {
        var layer = this.layers[l];
        for(var f = 0; f < layer.frames.length; f++) {
            var frame = layer.frames[f];
            for(var o = 0; o < frame.wickObjects.length; o++) {
                children.push(frame.wickObjects[o]);
                children = children.concat(frame.wickObjects[o].getAllChildObjectsRecursive());
            }
        }
    }
    return children;
}

/* Return all active child objects of a parent object (and their children) */
WickObject.prototype.getAllActiveChildObjectsRecursive = function (includeParents) {

    if (!this.isSymbol) {
        return [];
    }

    var children = [];
    for (var l = this.layers.length-1; l >= 0; l--) {
        var frame = this.getFrameAtPlayheadPosition(this.playheadPosition, {layerToSearch:this.layers[l]});
        if(frame) {
            for(var o = 0; o < frame.wickObjects.length; o++) {
                var obj = frame.wickObjects[o];
                if(includeParents || !obj.isSymbol) children.push(obj);
                children = children.concat(obj.getAllActiveChildObjectsRecursive(includeParents));
            }
        }
    }
    return children;
}

/* Return all child objects of a parent object */
WickObject.prototype.getAllChildObjects = function () {

    if (!this.isSymbol) {
        return [];
    }

    var children = [];
    for(var l = this.layers.length-1; l >= 0; l--) {
        var layer = this.layers[l];
        for(var f = 0; f < layer.frames.length; f++) {
            var frame = layer.frames[f];
            for(var o = 0; o < frame.wickObjects.length; o++) {
                children.push(frame.wickObjects[o]);
            }
        }
    }
    return children;
}

/* Return all child objects in the parent objects current frame. */
WickObject.prototype.getAllActiveChildObjects = function () {

    if (!this.isSymbol) {
        return [];
    }

    var children = [];
    for (var l = this.layers.length-1; l >= 0; l--) {
        var frame = this.getFrameAtPlayheadPosition(this.playheadPosition, {layerToSearch:this.layers[l]});
        if(frame) {
            frame.wickObjects.forEach(function (obj) {
                children.push(obj);
            });
        }
    }
    return children;
}

/* Return all child objects in the parent objects current layer. */
WickObject.prototype.getAllActiveLayerChildObjects = function () {

    if (!this.isSymbol) {
        return [];
    }

    var children = [];
    var layer = this.getCurrentLayer();
    var frame = this.getFrameAtPlayheadPosition(this.playheadPosition, {layerToSearch:layer});
    if(frame) {
        frame.wickObjects.forEach(function (obj) {
            children.push(obj);
        });
    }
    return children;
}

// Use this to render unselectable objects in Fabric
WickObject.prototype.getAllInactiveSiblings = function () {

    if(!this.parentObject) {
        return [];
    }

    var that = this;
    var siblings = [];
    this.parentObject.getAllActiveChildObjects().forEach(function (child) {
        if(child.id !== that.id) {
            siblings.push(child);
        }
    });
    siblings = siblings.concat(this.parentObject.getAllInactiveSiblings());

    return siblings;

}

// Use this for onion skinning
WickObject.prototype.getNearbyObjects = function (numFramesBack, numFramesForward) {

    // Get nearby frames

    var nearbyFrames = [];

    var startPlayheadPosition = Math.max(0, this.playheadPosition - numFramesBack);
    var endPlayheadPosition = this.playheadPosition + numFramesForward;
    var tempPlayheadPosition = startPlayheadPosition;

    while(tempPlayheadPosition <= endPlayheadPosition) {
        var frame = this.getFrameAtPlayheadPosition(tempPlayheadPosition);

        if(frame && tempPlayheadPosition !== this.playheadPosition && nearbyFrames.indexOf(frame) == -1) {
            nearbyFrames.push(frame);
        }
        
        tempPlayheadPosition ++;
    }

    // Get objects in nearby frames

    var nearbyObjects = [];

    nearbyFrames.forEach(function(frame) {
        nearbyObjects = nearbyObjects.concat(frame.wickObjects);
    });

    return nearbyObjects;

}

//
WickObject.prototype.getObjectsOnFirstFrame = function () {

    var objectsOnFirstFrame = [];

    this.layers.forEach(function (layer) {
        layer.frames[0].wickObjects.forEach(function (wickObj) {
            objectsOnFirstFrame.push(wickObj);
        });
    });

    return objectsOnFirstFrame;

}

/* Excludes children of children */
WickObject.prototype.getTotalNumChildren = function () {
    var count = 0;
    for(var l = 0; l < this.layers.length; l++) {
        for(var f = 0; f < this.layers[l].frames.length; f++) {
            for(var o = 0; o < this.layers[l].frames[f].wickObjects.length; o++) {
                count++;
            }
        }
    }
    return count;
}

WickObject.prototype.getChildByID = function (id) {

    if(!this.isSymbol) {
        if(this.id == id) {
            return this;
        } else {
            return null;
        }
    }

    if(this.isSymbol) {
        if(this.id == id) {
            return this;
        }
    }

    var foundChild = null;

    this.getAllChildObjects().forEach(function(child) {
        if(child.id == id) {
            if(!foundChild) foundChild = child;
        } else {
            if(!foundChild) foundChild = child.getChildByID(id);
        }
    });

    return foundChild;
}

WickObject.prototype.getFrameWithChild = function (child) {

    var foundFrame = null;

    this.layers.forEach(function (layer) {
        layer.frames.forEach(function (frame) {
            if(frame.wickObjects.indexOf(child) !== -1) {
                foundFrame = frame;
            }
        });
    });

    return foundFrame;
}

WickObject.prototype.getLayerWithChild = function (child) {

    var foundLayer = null;

    this.layers.forEach(function (layer) {
        layer.frames.forEach(function (frame) {
            if(frame.wickObjects.indexOf(child) !== -1) {
                foundLayer = layer;
            }
        });
    });

    return foundLayer;
}

WickObject.prototype.removeChildByID = function (id) {

    if(!this.isSymbol) {
        return;
    }

    var that = this;
    this.getAllActiveChildObjects().forEach(function(child) {
        if(child.id == id) {
            var index = that.getCurrentFrame().wickObjects.indexOf(child);
            that.getCurrentFrame().wickObjects.splice(index, 1);
        }
        child.removeChildByID(id);
    });
}

/* Used to generate a unique ID for new WickObjects */
WickObject.prototype.getLargestID = function (id) {
    if(!this.isSymbol) {
        return this.id;
    }

    var largestID = 0;

    if(this.id > largestID) {
        largestID = this.id;
    }
    this.getAllChildObjects().forEach(function(child) {
        var subLargestID = child.getLargestID();

        if(subLargestID > largestID) {
            largestID = subLargestID;
        }
    });

    return largestID;
}

/*************************
     Positioning stuff
*************************/

WickObject.prototype.regenBoundingBox = function () {
    /*if (wickEditor.project.getCurrentObject() === this) {
        wickEditor.interfaces.fabric.deselectAll();
        this.bbox = wickEditor.interfaces.fabric.getBoundingBoxOfAllObjects();
    } else {*/
        var ids = [];
        this.getAllChildObjects().forEach(function (child) {
            ids.push(child.id);
        });
        wickEditor.interfaces.fabric.deselectAll(); // to get correct ungrouped object positions
        this.bbox = wickEditor.interfaces.fabric.getBoundingBoxOfObjects(ids);
    //}
}

// used as a hack to get around fabric.js lack of rotation around anchorpoint
WickObject.prototype.fixOriginPoint = function (newSymbol) {
    if(this.playheadPosition === 0) this.regenBoundingBox();

    var bboxCenter = {x:this.bbox.left + this.bbox.width/2, y:this.bbox.top + this.bbox.height/2};

    var symbolCornerPosition = {x:this.x-bboxCenter.x, y:this.y-bboxCenter.y};

    var symbolAbsPos = this.parentObject.getAbsolutePosition();
    //symbolCornerPosition.x += symbolAbsPos.x;
    //symbolCornerPosition.y += symbolAbsPos.y;

    var that = this;
    this.getAllChildObjects().forEach(function (child) {
        child.x += symbolCornerPosition.x + symbolAbsPos.x;
        child.y += symbolCornerPosition.y + symbolAbsPos.y;
        if(newSymbol) {
            child.x += symbolAbsPos.x
            child.y += symbolAbsPos.y
        }
        if(!that.parentObject.isRoot && newSymbol) {
            //child.x += bboxCenter.x;
            //child.y += bboxCenter.y;
        }
    });
    this.x -= symbolCornerPosition.x + symbolAbsPos.x;
    this.y -= symbolCornerPosition.y + symbolAbsPos.y;
}

/* Get the absolute position of this object (i.e., the position not relative to the parents) */
WickObject.prototype.getAbsolutePosition = function () {
    if(this.isRoot) {
        return {
            x: this.x,
            y: this.y
        };
    } else {
        var parent = this.parentObject;
        var parentPosition = parent.getAbsolutePosition();
        return {
            x: this.x + parentPosition.x,
            y: this.y + parentPosition.y
        };
    }
}

/* Get the absolute position of this object taking into account the scale of the parent */
WickObject.prototype.getAbsolutePositionScaled = function () {
    if(this.isRoot) {
        return {
            x: this.x,
            y: this.y
        };
    } else {
        var parent = this.parentObject;
        var parentPosition = parent.getAbsolutePosition();
        var parentScale = parent.isRoot ? {x:1, y:1} : {x:parent.scaleX, y:parent.scaleY};
        return {
            x: this.x*parentScale.x + parentPosition.x,
            y: this.y*parentScale.y + parentPosition.y
        };
    }
}

WickObject.prototype.getAbsoluteScale = function () {
    if(this.isRoot) {
        return {
            x: this.scaleX,
            y: this.scaleY
        };
    } else {
        var parentScale = this.parentObject.getAbsoluteScale();
        return {
            x: this.scaleX * parentScale.x,
            y: this.scaleY * parentScale.y
        };
    }
}

WickObject.prototype.getAbsoluteAngle = function () {
    if(this.isRoot) {
        return this.angle;
    } else {
        var parentAngle = this.parentObject.getAbsoluteAngle();
        return this.angle + parentAngle;
    }
}

WickObject.prototype.isOnActiveLayer = function () {

    return this.parentObject.getLayerWithChild(this) === this.parentObject.getCurrentLayer();

}

WickObject.prototype.autocropImage = function (callback) {
    var that = this;

    var img = new Image();
    img.onload = function() {
        var cropImgData = removeBlankPixels(img, img.width, img.height);
        var croppedSrc = cropImgData.dataURL;
        var cropLeft = cropImgData.left;
        var cropTop = cropImgData.top;

        var autoCroppedImg = new Image();
        autoCroppedImg.onload = function () {

            AddPaddingToImage(autoCroppedImg, function (paddedImgSrc) {
                var paddedImg = new Image();
                paddedImg.onload = function () {
                    that.width  = paddedImg.width;
                    that.height = paddedImg.height;
                    that.x += cropLeft + that.width/2;
                    that.y += cropTop  + that.height/2;
                    that.imageData = paddedImg.src;
                    that.imageDirty = true;
                    callback();
                }
                paddedImg.src = paddedImgSrc;
            });
        }
        autoCroppedImg.src = croppedSrc;
    }
    img.src = this.imageData;
}

WickObject.prototype.getBlobImages = function (callback) {
    var that = this;

    FindBlobsAndGetBlobImages(this.imageData, function (blobImages) {
        callback(blobImages);
    });
}

/*************************
    Export
*************************/

WickObject.JSONReplacer = function(key, value) {
    var dontJSONVars = ["id","parentObject","causedAnException","paperData","cachedFabricObject"];

    if (dontJSONVars.indexOf(key) !== -1) {
        return undefined;
    } else {
        return value;
    }
}

WickObject.prototype.getAsJSON = function () {
    var oldX = this.x;
    var oldY = this.y;
    var absPos = this.getAbsolutePosition();
    this.x = absPos.x;
    this.y = absPos.y;

    // Encode scripts to avoid JSON format problems
    this.encodeStrings();

    var JSONWickObject = JSON.stringify(this, WickObject.JSONReplacer);

    // Put prototypes back on object ('class methods'), they don't get JSONified on project export.
    WickObject.addPrototypes(this);

    // Decode scripts back to human-readble and eval()-able format
    this.decodeStrings();

    this.x = oldX;
    this.y = oldY;

    return JSONWickObject;
}

WickObject.prototype.downloadAsFile = function () {

    var filename = this.name || "wickobject";

    if(this.isSymbol) {
        var blob = new Blob([this.getAsJSON()], {type: "text/plain;charset=utf-8"});
        saveAs(blob, filename+".json");
        return;
    }

    function dataURItoBlob(dataURI) {
      // convert base64 to raw binary data held in a string
      // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
      var byteString = atob(dataURI.split(',')[1]);

      // separate out the mime component
      var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

      // write the bytes of the string to an ArrayBuffer
      var ab = new ArrayBuffer(byteString.length);
      var ia = new Uint8Array(ab);
      for (var i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
      }

      // write the ArrayBuffer to a blob, and you're done
      var blob = new Blob([ab], {type: mimeString});
      return blob;

      // Old code
      // var bb = new BlobBuilder();
      // bb.append(ab);
      // return bb.getBlob(mimeString);
    }

    if(this.imageData) {
        saveAs(dataURItoBlob(this.imageData), filename+".png");
        return;
    }

    if(this.svgCacheImageData) {
        saveAs(dataURItoBlob(this.svgCacheImageData), filename+".png");
        return;
    }

    if(this.audioData) {
        saveAs(dataURItoBlob(this.audioData), filename+".wav");
        return;
    }

    console.error("export not supported for this type of wickobject yet");

}

WickObject.addPrototypes = function (obj) {

    // Put the prototype back on this object
    obj.__proto__ = WickObject.prototype;

    // Recursively put the prototypes back on the children objects
    if(obj.tweens) { // Rescues old projects created before tweens came out
        obj.tweens.forEach(function (tween) {
            tween.__proto__ = WickTween.prototype;
        });
    }

    if(obj.isSymbol) {
        obj.layers.forEach(function (layer) {
            layer.__proto__ = WickLayer.prototype;
            layer.frames.forEach(function(frame) {
                frame.__proto__ = WickFrame.prototype;
            });
        });

        obj.getAllChildObjects().forEach(function(currObj) {
            WickObject.addPrototypes(currObj);
        });
    }
}

/* Encodes scripts and strings to avoid JSON format problems */
WickObject.prototype.encodeStrings = function () {

    var encodeString = function (str) {
        var newStr = str;
        newStr = encodeURI(str);
        newStr = newStr.replace(/'/g, "%27");
        return newStr;
    }

    if(this.wickScripts) {
        for (var key in this.wickScripts) {
            this.wickScripts[key] = encodeString(this.wickScripts[key]);
        }
    }

    if(this.fontData) {
        this.fontData.text = encodeString(this.fontData.text);
    }

    if(this.svgData) {
        this.svgData.svgString = encodeString(this.svgData.svgString);
    }

    if(this.isSymbol) {
        this.getAllChildObjects().forEach(function(child) {
            child.encodeStrings();
        });
    }

}

/* Decodes scripts and strings back to human-readble and eval()-able format */
WickObject.prototype.decodeStrings = function () {
    
    var decodeString = function (str) {
        var newStr = str;
        newStr = newStr.replace(/%27/g, "'");
        newStr = decodeURI(str);
        return newStr;
    }
    
    if(this.wickScripts) {
        for (var key in this.wickScripts) {
            this.wickScripts[key] = decodeString(this.wickScripts[key])
        }
    }

    if(this.fontData) {
        this.fontData.text = decodeString(this.fontData.text);
    }

    if(this.svgData) {
        this.svgData.svgString = decodeString(this.svgData.svgString);
    }

    if(this.isSymbol) {
        this.getAllChildObjects().forEach(function(child) {
            child.decodeStrings();
        });
    }

}

WickObject.prototype.generateParentObjectReferences = function() {

    var parentObject = this;

    if(this.isSymbol) {

        // Recursively regenerate parent object references of all objects inside this symbol.
        this.getAllChildObjects().forEach(function(child) {
            child.parentObject = parentObject;
            child.generateParentObjectReferences();
        });
    }

}

WickObject.prototype.generateObjectNameReferences = function () {

    var that = this;

    this.getAllChildObjects().forEach(function(child) {
        that[child.name] = child;

        if(child.isSymbol) {
            child.generateObjectNameReferences();
        }
    });

}

// Used so that if the renderer can't render SVGs it has an image to fallback to
WickObject.prototype.generateSVGCacheImages = function (callback) {

    var that = this;

    if(this.svgData) {

        fabric.loadSVGFromString(this.svgData.svgString, function(objects, options) {
            objects[0].fill = that.svgData.fillColor;
            var svgFabricObject = fabric.util.groupSVGElements(objects, options);
            svgFabricObject.scaleX /= window.devicePixelRatio;
            svgFabricObject.scaleY /= window.devicePixelRatio;
            svgFabricObject.setCoords();
            svgFabricObject.cloneAsImage(function(clone) {
                var element = clone.getElement();
                var imgSrc = element.src;
                that.svgCacheImageData = imgSrc;
                callback();
            }, {enableRetinaScaling:false});
        });

    } else if(this.isSymbol) {

        var childrenConverted = 0;
        var nChildren = that.getTotalNumChildren();

        if(nChildren == 0) {
            callback();
        }

        this.getAllChildObjects().forEach(function(currObj) {
            currObj.generateSVGCacheImages(function () {
                childrenConverted++;
                if(childrenConverted == nChildren) {
                    callback();
                }
            });
        });
    } else {
        callback();
    }

}

/* Generate alpha mask for per-pixel hit detection */
WickObject.prototype.generateAlphaMask = function () {

    var that = this;

    var alphaMaskSrc = that.imageData || that.svgCacheImageData;
    if(!alphaMaskSrc) return;

    ImageToCanvas(alphaMaskSrc, function (canvas,ctx) {
        var w = canvas.width;
        var h = canvas.height;
        var rgba = ctx.getImageData(0,0,w,h).data;
        that.alphaMask = [];
        for (var y = 0; y < h; y ++) {
            for (var x = 0; x < w; x ++) {
                var alphaMaskIndex = x+y*w;
                that.alphaMask[alphaMaskIndex] = rgba[alphaMaskIndex*4+3] <= 10;
            }
        }
    }, {width:Math.floor(that.width), height:Math.floor(that.height)} );

}

/*************************
     Tween stuff
*************************/

WickObject.prototype.addTween = function (newTween) {
    var self = this;

    var replacedTween = false;
    this.tweens.forEach(function (tween) {
        if (tween.frame === newTween.frame) {
            self.tweens[self.tweens.indexOf(tween)] = newTween;
            replacedTween = true;
        }
    });

    if(!replacedTween)
        this.tweens.push(newTween);
}

WickObject.prototype.removeTween = function (tweenToDelete) {
    var self = this;

    var deleteTweenIndex = null;
    this.tweens.forEach(function (tween) {
        if(deleteTweenIndex) return;
        if (tweenToDelete === tween) {
            deleteTweenIndex = self.tweens.indexOf(tween);
        }
    });

    if(deleteTweenIndex !== null) {
        myArray.splice(deleteTweenIndex, 1);
    }
}

WickObject.prototype.hasTweenAtFrame = function (frame) {
    var foundTween = false
    this.tweens.forEach(function (tween) {
        if(foundTween) return;
        if(tween.frame === frame) foundTween = true;
    })
    return foundTween;
}

WickObject.prototype.getFromTween = function () {
    var foundTween = null;

    var relativePlayheadPosition = this.parentObject.getRelativePlayheadPosition(this);

    var seekPlayheadPosition = relativePlayheadPosition;
    while (!foundTween && seekPlayheadPosition >= 0) {
        this.tweens.forEach(function (tween) {
            if(tween.frame === seekPlayheadPosition) {
                foundTween = tween;
            }
        });
        seekPlayheadPosition--;
    }

    return foundTween;
}

WickObject.prototype.getToTween = function () {
    var foundTween = null;

    var relativePlayheadPosition = this.parentObject.getRelativePlayheadPosition(this);

    var seekPlayheadPosition = relativePlayheadPosition;
    var parentFrameLength = this.parentObject.getFrameWithChild(this).frameLength;
    while (!foundTween && seekPlayheadPosition < parentFrameLength) {
        this.tweens.forEach(function (tween) {
            if(tween.frame === seekPlayheadPosition) {
                foundTween = tween;
            }
        });
        seekPlayheadPosition++;
    }

    return foundTween;
}

WickObject.prototype.applyTweens = function () {

    var that = this;

    if(!this.tweens) this.tweens = []; // Rescue old projects created before tweens came out

    if (!this.isRoot && this.tweens.length > 0) {
        if(this.tweens.length === 1) {
            this.tweens[0].applyTweenToWickObject(that);
        } else {
            var tweenFrom = that.getFromTween();
            var tweenTo = that.getToTween();

            if (tweenFrom && tweenTo) {
                // yuck
                var A = tweenFrom.frame;
                var B = tweenTo.frame;
                var L = B-A;
                var P = that.parentObject.getRelativePlayheadPosition(that)-A;
                var T = P/L;
                if(B-A === 0) T = 1;

                var interpFunc = eval("("+tweenFrom.interpFunc+")")
                var interpolatedTween = WickTween.interpolateTweens(tweenFrom, tweenTo, T, interpFunc);
                interpolatedTween.applyTweenToWickObject(that);
            }
            if (!tweenFrom && tweenTo) {
                tweenTo.applyTweenToWickObject(that);
            }
            if (!tweenTo && tweenFrom) {
                tweenFrom.applyTweenToWickObject(that);
            }
        }
    }

    if (!this.isSymbol) return;

    this.getAllActiveChildObjects().forEach(function (child) {
        child.applyTweens();
    });

}

/*************************
     
*************************/

WickObject.prototype.scriptsAllEmpty = function () {
    var allEmpty = true;
    for(scriptName in this.wickScripts) {
        if (this.wickScripts[scriptName] !== "") allEmpty = false;
    }
    return allEmpty;
}

WickObject.prototype.isClickable = function () {
    var isClickable = false;

    this.wickScripts['onClick'].split("\n").forEach(function (line) {
        if(isClickable) return;
        line = line.trim();
        if(!line.startsWith("//") && line !== "") {
            isClickable = true;
        }
    });

    return isClickable;
}

WickObject.prototype.isPointInside = function(point) {

    var objects = this.getAllActiveChildObjectsRecursive(false);
    if(!this.isSymbol) {
        objects.push(this);
    }

    var hit = false;

    objects.forEach(function(object) {
        if(hit) return;

        var absPosition = object.getAbsolutePositionScaled();
        var absScale = object.getAbsoluteScale();
        var absAngle = object.getAbsoluteAngle();

        var scaledObjX = absPosition.x;
        var scaledObjY = absPosition.y;
        var scaledObjWidth  = object.width *absScale.x;
        var scaledObjHeight = object.height*absScale.y;

        scaledObjX -= scaledObjWidth/2;
        scaledObjY -= scaledObjHeight/2;

        if ( point.x >= scaledObjX &&
             point.y >= scaledObjY  &&
             point.x <= scaledObjX + scaledObjWidth &&
             point.y <= scaledObjY + scaledObjHeight ) {

            if(!object.alphaMask) {
                hit = true;
                return;
            }

            var objectRelativePointX = (point.x - scaledObjX);
            var objectRelativePointY = (point.y - scaledObjY);
            var objectAlphaMaskIndex =
                (Math.floor(objectRelativePointX/absScale.x)%Math.floor(object.width)) +
                (Math.floor(objectRelativePointY/absScale.y)*Math.floor(object.width));
            if(!object.alphaMask[(objectAlphaMaskIndex)]) {
                hit = true;
                return;
            }

        }
    });

    return hit;
}

/*************************
     Scripting methods
*************************/

WickObject.prototype.update = function () {

    if(this.deleted) return;

    if(this.onNewFrame) {

        if(this.isSymbol) {
            var currentFrame = this.getCurrentFrame();

            if(currentFrame && !currentFrame.autoplay) {
                this.isPlaying = false;
            }

            this.runScript(currentFrame.wickScripts['onLoad'], 'onLoad', this);
        }

        this.onNewFrame = false;
    }

    if(this.justEnteredFrame) {

        if(!this.onLoadScriptRan) {
            this.runScript(this.wickScripts['onLoad'], 'onLoad');
            this.onLoadScriptRan = true;
        }

        if(this.autoplaySound) {
            this.playSound();
        }

        this.justEnteredFrame = false;
    }

    this.runScript(this.wickScripts['onUpdate'], 'onUpdate');

    if(this.isSymbol) {
        this.advanceTimeline();

        // For now, the WickObject that owns the frame runs the frame's scripts.
        // So, play(), stop() etc refers to the timeline that the frame is in.
        // The 'this' keyword is borked though, since it still will refer to the WickObject.
        if(this.getCurrentFrame())
            this.runScript(this.getCurrentFrame().wickScripts['onUpdate'], 'onUpdate', this);

        this.getAllActiveChildObjects().forEach(function(child) {
            child.update();
        });
    }

    this.readyToAdvance = true;

}

WickObject.prototype.runScript = function (script, scriptType, objectScope) {

    var that = this;

    if(!objectScope) objectScope = this.parentObject;

    // Setup wickobject reference variables
    var project = WickPlayer.getProject() || wickEditor.project;
    var root = project.rootObject;
    var parent = this.parentObject;
    var mouse = WickPlayer.getMouse();
    var keys = WickPlayer.getKeys();
    var key = WickPlayer.getLastKeyPressed();

    project.width = project.resolution.x;
    project.height = project.resolution.y;

    // Setup builtin wick scripting methods and objects
    var play          = function ()      { objectScope.play(); }
    var stop          = function ()      { objectScope.stop(); }
    var gotoAndPlay   = function (frame) { objectScope.gotoAndPlay(frame); }
    var gotoAndStop   = function (frame) { objectScope.gotoAndStop(frame); }
    var gotoNextFrame = function ()      { objectScope.gotoNextFrame(); }
    var gotoPrevFrame = function ()      { objectScope.gotoPrevFrame(); }

    // Etc. player wrappers
    var stopAllSounds = function () { WickPlayer.getAudioPlayer().stopAllSounds(); };
    var isKeyDown = function (keyString) { return keys[keyCharToCode[keyString]]; };
    var hideCursor = function () { WickPlayer.hideCursor(); };
    var showCursor = function () { WickPlayer.showCursor(); };
    var enterFullscreen = function () { WickPlayer.enterFullscreen(); }

    // WickObjects in same frame (scope) are accessable without using root./parent.
    if(objectScope) {
        objectScope.getAllChildObjects().forEach(function(child) {
            if(child.name) window[child.name] = child;
        });
    }
        
    // Run da script!!
    try {
        //eval(script);
        eval("try{" + script + "\n}catch (e) { throw (e); }");
    } catch (e) {
        if (window.wickEditor) {
            //if(!wickEditor.interfaces.builtinplayer.running) return;

            console.error("Exception thrown while running script of WickObject: " + this.name);
            console.error(e);
            var lineNumber = null;
            if(e.stack) {
                e.stack.split('\n').forEach(function (line) {
                    if(lineNumber) return;
                    if(!line.includes("<anonymous>:")) return;

                    lineNumber = parseInt(line.split("<anonymous>:")[1].split(":")[0]);
                });
            }

            //console.log(e.stack.split("\n")[1].split('<anonymous>:')[1].split(":")[0]);
            //console.log(e.stack.split("\n"))
            if(wickEditor.interfaces.builtinplayer.running) wickEditor.interfaces.builtinplayer.stopRunningProject()
            wickEditor.interfaces.scriptingide.showError(this.id, scriptType, lineNumber, e);
        } else {
            alert("An exception was thrown while running a WickObject script. See console!");
            console.log(e);
        }
    }
    //eval("try{" + script + "}catch (e) { console.log(e); }");

    // Get rid of wickobject reference variables
    if(!this.isRoot) {
        this.parentObject.getAllChildObjects().forEach(function(child) {
            if(child.name) window[child.name] = undefined;
        });
    }

}

WickObject.prototype.advanceTimeline = function () {
    // Advance timeline for this object
    if(this.isPlaying && this.readyToAdvance) {

        var oldFrame = this.getCurrentFrame();
        this.playheadPosition ++;

        // If we reached the end, go back to the beginning
        if(this.playheadPosition >= this.getTotalTimelineLength()) {
            this.playheadPosition = 0;
        }

        var newFrame = this.getCurrentFrame();

        if(oldFrame !== newFrame) {
            this.onNewFrame = true;
            if(!newFrame.alwaysSaveState) {
                //this.getAllActiveChildObjects().forEach(function (child) {
                newFrame.wickObjects.forEach(function (child) {
                    WickPlayer.resetStateOfObject(child);
                });
            }
            this.getAllActiveChildObjects().forEach(function (child) {
                child.justEnteredFrame = true;
            });
        }
    }

}

WickObject.prototype.play = function () {

    if(!this.isSymbol) {
        throw "play() called on wickobject that isn't a symbol!";
        return;
    }

    this.isPlaying = true;
}

WickObject.prototype.stop = function () {

    if(!this.isSymbol) {
        throw "stop() called on wickobject that isn't a symbol!";
        return;
    }

    this.isPlaying = false;
}

WickObject.prototype.gotoFrame = function (frame) {

    var oldFrame = this.getCurrentFrame();

    // Frames are zero-indexed internally but start at one in the editor GUI, so you gotta subtract 1.
    if (CheckInput.isNonNegativeInteger(frame)) {

        var actualFrame = frame-1;

        // Only navigate to an integer frame if it is nonnegative and a valid frame
        if(actualFrame < this.getCurrentLayer().frames.length) {
            this.playheadPosition = actualFrame;
        } else {
            throw (new Error("Failed to navigate to frame \'" + actualFrame + "\': is not a valid frame."));
        }

    } else if (CheckInput.isString(frame)) {

        // Search for the frame with the correct identifier and navigate if found
        var newFrame = this.getFrameByIdentifier(frame);

        if(newFrame)
            this.playheadPosition = this.getPlayheadPositionAtFrame(newFrame);
        else
            throw "Failed to navigate to frame \'" + frame + "\': is not a valid frame.";

    } else {

        throw "Failed to navigate to frame \'" + frame + "\': is neither a string nor a nonnegative integer";

    }

    var newFrame = this.getCurrentFrame();

    if(newFrame !== oldFrame) {
        this.onNewFrame = true;
        if(!newFrame.alwaysSaveState) {
            //this.getAllActiveChildObjects().forEach(function (child) {
            newFrame.wickObjects.forEach(function (child) {
                WickPlayer.resetStateOfObject(child);
            });
        }
        this.getAllActiveChildObjects().forEach(function (child) {
            child.justEnteredFrame = true;
        });
    }

}

WickObject.prototype.gotoAndPlay = function (frame) {

    if(!this.isSymbol) {
        throw "gotoAndPlay() called on wickobject that isn't a symbol!";
        return;
    }

    this.readyToAdvance = false;
    this.gotoFrame(frame);
    this.isPlaying = true;
    
}

WickObject.prototype.gotoAndStop = function (frame) {

    if(!this.isSymbol) {
        throw "gotoAndStop() called on wickobject that isn't a symbol!";
        return;
    }
    
    this.gotoFrame(frame);
    this.isPlaying = false;

}

WickObject.prototype.gotoNextFrame = function () {

    if(!this.isSymbol) {
        throw "gotoNextFrame() called on wickobject that isn't a symbol!";
        return;
    }

    this.playheadPosition ++;
    var totalLength = this.layers[this.currentLayer.getTotalLength];
    if(this.playheadPosition >= totalLength) {
        this.playheadPosition = totalLength-1;
    }

}

WickObject.prototype.gotoPrevFrame = function () {

    if(!this.isSymbol) {
        throw "gotoPrevFrame() called on wickobject that isn't a symbol!";
        return;
    }

    this.playheadPosition --;
    if(this.playheadPosition < 0) {
        this.playheadPosition = 0;
    }
}

/* Determine if two wick objects collide using rectangular hit detection on their
       farthest border */
WickObject.prototype.hitTestRectangles = function (otherObj) {
    var objA = this;
    var objB = otherObj;

    var objAAbsPos = objA.getAbsolutePositionScaled();
    var objBAbsPos = objB.getAbsolutePositionScaled();

    var objAScale  = objA.getAbsoluteScale();
    var objAWidth  = objA.width  * objAScale.x;
    var objAHeight = objA.height * objAScale.y;
    objAAbsPos.x  -= objA.width  * objAScale.x/2;
    objAAbsPos.y  -= objA.height * objAScale.y/2;

    var objBScale  = objB.getAbsoluteScale();
    var objBWidth  = objB.width  * objBScale.x;
    var objBHeight = objB.height * objBScale.y;
    objBAbsPos.x  -= objB.width  * objBScale.x/2;
    objBAbsPos.y  -= objB.height * objBScale.y/2;

    var left = objAAbsPos.x < (objBAbsPos.x + objBWidth);
    var right = (objAAbsPos.x + objAWidth) > objBAbsPos.x;
    var top = objAAbsPos.y < (objBAbsPos.y + objBHeight);
    var bottom = (objAAbsPos.y + objAHeight) > objBAbsPos.y;

    return left && right && top && bottom;
}

/* Determine if two wickObjects Collide using circular hit detection from their
   centroid using their full width and height. */
WickObject.prototype.hitTestCircles = function (otherObj) {
    var objA = this;
    var objB = otherObj;
    
    var objAAbsPos = objA.getAbsolutePositionScaled();
    var objBAbsPos = objB.getAbsolutePositionScaled();

    var dx = objAAbsPos.x - objBAbsPos.x;
    var dy = objAAbsPos.y - objBAbsPos.y;

    var objAWidth = objA.width * objA.scaleX;
    var objAHeight = objAHeight * objA.scaleY;

    var distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < ((objAWidth/2) + (objBWidth/2))) {
        return true;
    }

    return false;
}

/* Returns a boolean alerting whether or not this object or any of it's children in frame,
   have collided with the given object or any of it's children in frame. */
WickObject.prototype.hitTest = function (otherObj, hitTestType) {
    if (otherObj === undefined) {
        return false;
    }

    // Generate lists of all children of both objects

    var otherObjChildren = otherObj.getAllActiveChildObjectsRecursive(false);
    if(!otherObj.isSymbol) {
        otherObjChildren.push(otherObj);
    }

    var thisObjChildren = this.getAllActiveChildObjectsRecursive(false);
    if(!this.isSymbol) {
        thisObjChildren.push(this);
    }

    // Load the collision detection function for the type of collision we want to check for

    var checkMethod;
    var hitTestMethods = {
        "rectangles" : "hitTestRectangles",
        "circles" : "hitTestCircles"
    }
    if(!hitTestType) {
        // Use default (rectangular hittest) if no hitTestType is provided
        checkMethod = hitTestMethods["rectangles"];
    } else {
        checkMethod = hitTestMethods[hitTestType];
        if(!checkMethod) {
            throw "Invalid hitTest collision type: " + hitTestType;
        }
    }

    // Ready to go! Check for collisions!!

    for (var i = 0; i < otherObjChildren.length; i++) {
        for (var j = 0; j < thisObjChildren.length; j++) {
            var objA = thisObjChildren[j];
            var objB = otherObjChildren[i];
            // Note: audio objects are like 'ghost' objects, they don't actually
            // show up visually in the player so they should not count in hitTest.
            if (!objA.audioData && !objB.audioData && objA[checkMethod](objB)) {
                return true;
            }
        }
    }

    return false;

}

WickObject.prototype.copy = function () {

    var copiedObject = new WickObject();

    copiedObject.name = undefined; // ???? Should we generate a name based on the object being copied?

    copiedObject.x = this.x;
    copiedObject.y = this.y;
    copiedObject.width = this.width;
    copiedObject.height = this.height;
    copiedObject.scaleX = this.scaleX;
    copiedObject.scaleY = this.scaleY;
    copiedObject.angle = this.angle;
    copiedObject.flipX = this.flipX;
    copiedObject.flipY = this.flipY;
    copiedObject.opacity = this.opacity;

    //copiedObject.tweens = ; // TODO: Copy tweens!!!

    copiedObject.wickScripts = {};
    copiedObject.wickScripts.onLoad = this.wickScripts.onLoad;
    copiedObject.wickScripts.onClick = this.wickScripts.onClick;
    copiedObject.wickScripts.onUpdate = this.wickScripts.onUpdate;
    copiedObject.wickScripts.onKeyDown = this.wickScripts.onKeyDown;

    if(this.isSymbol) {
        copiedObject.isSymbol = true;

        copiedObject.playheadPosition = 0;
        copiedObject.currentLayer = 0;

        copiedObject.layers = [];
        this.layers.forEach(function (layer) {
            copiedObject.layers.push(layer.copy());
        });
    } else {
        copiedObject.isSymbol = false;

        copiedObject.imageData = this.imageData;
        copiedObject.fontData = this.fontData;
        copiedObject.svgData = this.svgData;
        copiedObject.svgCacheImageData = this.svgCacheImageData;
    }

    return copiedObject;

}

/*****************************
 *      Object Movement      *
 *****************************/

WickObject.prototype.moveUp = function(delta) {
    if (delta === undefined) {
        delta = 1;
    }

    if (typeof delta != "number") {
        WickError.error("Invalid Input: moveUp() can only take numbers!");
    }

    this.y -= delta;
}

WickObject.prototype.moveDown = function(delta) {
    if (delta === undefined) {
        delta = 1;
    }

    if (typeof delta != "number") {
        WickError.error("Invalid Input: moveDown() can only take numbers!");
    }

    this.y += delta;
}

WickObject.prototype.moveLeft = function(delta) {
    if (delta === undefined) {
        delta = 1;
    }

    if (typeof delta != "number") {
        WickError.error("Invalid Input: moveLeft() can only take numbers!");
    }

    this.x -= delta;
}

WickObject.prototype.moveRight = function(delta) {
    if (delta === undefined) {
        delta = 1;
    }

    if (typeof delta != "number") {
        WickError.error("Invalid Input: moveRight() can only take numbers!");
    }

    this.x += delta;
}

WickObject.prototype.rotateCW = function(theta) {
    if (theta === undefined) {
        theta = 1;
    }

    if (typeof theta != "number") {
        WickError.error("Invalid Input: rotateCW() can only take numbers!");
    }

    this.angle += theta;
}

WickObject.prototype.rotateCCW = function(theta) {
    if (theta === undefined) {
        theta = 1;
    }

    if (typeof theta != "number") {
        WickError.error("Invalid Input: rotateCCW() can only take numbers!");
    }

    this.angle -= theta;
}

WickObject.prototype.scale = function(scaleFactor) {
    if (scaleFactor === undefined) {
        scaleFactor = 1;
    }

    if (typeof scaleFactor != "number") {
        WickError.error("Invalid Input: scale() can only take numbers!");
    }

    this.scaleX = scaleFactor;
    this.scaleY = scaleFactor;
}

WickObject.prototype.scaleWidth = function(scaleFactor) {
    if (scaleFactor === undefined) {
        scaleFactor = 1;
    }

    if (typeof scaleFactor != "number") {
        WickError.error("Invalid Input: scaleWidth() can only take numbers!");
    }

    this.scaleX = scaleFactor;
}

WickObject.prototype.scaleHeight = function(scaleFactor) {
    if (scaleFactor === undefined) {
        scaleFactor = 1;
    }

    if (typeof scaleFactor != "number") {
        WickError.error("Invalid Input: scaleHeight() can only take numbers!");
    }

    this.scaleY = scaleFactor;
}

WickObject.prototype.flipHorizontal = function() {
    this.flipX = !this.flipX;
}

WickObject.prototype.flipVertical = function() {
    this.flipY = !this.flipY;
}

WickObject.prototype.setOpacity = function(opacityVal) {
    if (typeof opacityVal != "number") {
        WickError.error("Invalid Input: setOpacity() can only take numbers!");
    }

    this.opacity = Math.min(Math.max(opacityVal, 0), 1);
}

WickObject.prototype.setText = function (text) {
    this.pixiText.text = ""+text;
}

WickObject.prototype.playSound = function (volume) {

    WickPlayer.getAudioPlayer().playSound(this.id, this.loopSound, volume || 1.0);

}

WickObject.prototype.stopSound = function () {

    WickPlayer.getAudioPlayer().stopSound(this.id);

}

WickObject.prototype.clone = function () {

    return WickPlayer.cloneObject(this);

};

WickObject.prototype.delete = function () {

    return WickPlayer.deleteObject(this);

};

