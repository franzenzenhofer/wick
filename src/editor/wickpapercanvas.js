/* Wick - (c) 2016 Zach Rispoli, Luca Damasco, and Josh Rispoli */

var PaperCanvas = function (wickEditor) {

    this.canvas = document.getElementById('paperCanvas');
    paper.setup(this.canvas);

    

    this.redraw = function () {
        paper.view.draw();
    }

    this.resize = function () {
        console.log("yes")
        this.canvas.style.width  = window.innerWidth  + "px";
        this.canvas.style.height = window.innerHeight + "px";
        this.canvas.width  = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    function removeChildrenRecursively(item) {
        if(item.children && item.children.length > 0) {
            var itemNoChildren = item.removeChildren();
            item.parent.insertChildren(item.index, itemNoChildren);
            item.remove();

            removeChildrenRecursively(itemNoChildren[0]);
        }
    }

    function iterateOverAllChildren(item, d) {

        if(!item.children) {
            return;
        }

        console.log(d);

        for(var i = 0; i < item.children.length; i++) {
            console.log(item.children[i]);
            iterateOverAllChildren(item.children[i], d+1);
        }

    }

    var that = this;

    var file = document.getElementById('file');
    file.addEventListener('change', function (event) {
        var files = event.target.files;
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (file.type.match('svg')) {
                
                paper.project.importSVG(file, function(item) {
                    console.log(item)
                    //removeChildrenRecursively(item);
                    iterateOverAllChildren(item, 0)
                    that.resize();
                    paper.view.draw();
                    wickEditor.fabricCanvas.reloadPaperCanvas();
                });
            }
        }
    });

    var values = {
        paths: 50,
        minPoints: 5,
        maxPoints: 15,
        minRadius: 30,
        maxRadius: 90
    };

    var hitOptions = {
        segments: true,
        stroke: true,
        fill: true,
        tolerance: 5
    };

    //createPaths();

    function createPaths() {
        var radiusDelta = values.maxRadius - values.minRadius;
        var pointsDelta = values.maxPoints - values.minPoints;
        for (var i = 0; i < values.paths; i++) {
            var radius = values.minRadius + Math.random() * radiusDelta;
            var points = values.minPoints + Math.floor(Math.random() * pointsDelta);
            var path = createBlob(view.size * Point.random(), radius, points);
            var lightness = (Math.random() - 0.5) * 0.4 + 0.4;
            var hue = Math.random() * 360;
            path.fillColor = { hue: hue, saturation: 1, lightness: lightness };
            path.strokeColor = 'black';
        };
    }

    function createBlob(center, maxRadius, points) {
        var path = new Path();
        path.closed = true;
        for (var i = 0; i < points; i++) {
            var delta = new Point({
                length: (maxRadius * 0.5) + (Math.random() * maxRadius * 0.5),
                angle: (360 / points) * i
            });
            path.add(center + delta);
        }
        path.smooth();
        return path;
    }

    var recursiveHitOptions = {
        segments: true,
        stroke: true,
        fill: true,
        tolerance: 0
    }

    function tryFillHole(item, point, d) {

        if(!item.children) {
            return;
        }

        for(var i = 0; i < item.children.length; i++) {
            var child = item.children[i];

            //console.log(child);
            if(child instanceof Path) {
                var hitResult = child.hitTest(point, recursiveHitOptions);
                if(hitResult && hitResult.item.clockwise) {
                    // hole
                    //var itemNoChildren = item.removeChildren();
                    //item.parent.insertChildren(item.index, itemNoChildren);
                    //item.remove();
                    var clone = hitResult.item.clone();
                    clone.fillColor = "#ff0000";
                    project.activeLayer.addChild(clone);
                    return true;
                }
            }

            if(tryFillHole(child, point, d+1)) {
                return true;
            }
        }

        return false;

    }

    function tryFillPath(item, point, d) {

        if(!item.children) {
            return;
        }

        for(var i = 0; i < item.children.length; i++) {
            var child = item.children[i];

            //console.log(child);
            if(child instanceof Path) {
                var hitResult = child.hitTest(point, recursiveHitOptions);
                if(hitResult && !hitResult.item.clockwise) {
                    console.log(hitResult.item);
                    item.fillColor = "#ff0000";
                }
            }

            tryFillPath(child, point, d+1);
        }

    }

    var segment, path;
    var movePath = false;
    var onMouseDown = function(event) {

        if (currentTool == "FillBucket") {

            console.log("recursiveHitTest:")
            if(!tryFillHole(project.activeLayer, event.point, 0)) {
                tryFillPath(project.activeLayer, event.point, 0);
            }

        }

        else if (currentTool == "Cursor") {

            segment = path = null;
            var hitResult = project.hitTest(event.point, hitOptions);
            if (!hitResult)
                return;

            if (event.modifiers.shift) {
                if (hitResult.type == 'segment') {
                    hitResult.segment.remove();
                };
                return;
            }

            if (hitResult) {
                path = hitResult.item;

                if (hitResult.type == 'segment') {
                    segment = hitResult.segment;
                } else if (hitResult.type == 'stroke') {
                    var location = hitResult.location;
                    segment = path.insert(location.index + 1, event.point);
                    //path.smooth();
                }
            }
            movePath = hitResult.type == 'fill';
            if (movePath)
                project.activeLayer.addChild(hitResult.item);
        }

    }

    var onMouseMove = function (event) {
        project.activeLayer.selected = false;
        if (event.item) {
            event.item.selected = true;
        }
    }

    var onMouseDrag = function (event) {
        if (segment) {
            segment.point += event.delta;
            //path.smooth();
        } else if (path) {
            path.position += event.delta;
        }
    }
    
}