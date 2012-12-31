//Constructor for the main Canvas Map library.  Using Javascript object to support multiple Canvas Maps on a single webpage.

//TODO: Make revealing prototype instead?
CanvasMap = function(id, undefined) {
    var that = this;
    var canvas = document.getElementById(id);
    if(!canvas)  {
        throw new Error("Cannot find DOM element with id: " + id);
    }

    var context = canvas.getContext && canvas.getContext('2d');
    if(!context) {
        throw new Error("Browser does not support canvas element");
    }

    //Get the angle in radians between two points.
    var getAngle = function(xFrom, yFrom, xTo, yTo) {
        return Math.atan2(yTo - yFrom, xTo - xFrom);
    }

    //Current position canvas is translated
    var originX = 0;
    var originY = 0;

    //Total size of the canvas drawing.
    var sizeX = 0;
    var sizeY = 0;

    //How far zoomed in
    var scale = 1;

    //Default line stroke and width
    var defaultStrokeWidth = 1;
    var defaultStrokeStyle = "black";
    var defaultTextColor = "black";
    var defaultTextFont = "10px sans-serif";


    //Mathematical functions
    this.math = {
        //Source: http://jsfromhell.com/math/is-point-in-poly
        //Checks whether the point is inside the polygon.
        //polygon array of points, each element must be an object with two properties (x and y).  The first and last point should match.
        //point, object with two properties (x and y)
        pointInPoly : function(poly, pt) {
            for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
                ((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y))
                && (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
                && (c = !c);
            return c;
        },

        //Two dimensional cross product defined as: p1x * p2y - p2x * p1y
        //Returns a scalar numeric value
        crossProduct2D : function(p1, p2) {
            return (p1.x * p2.y) - (p2.x * p1.y);
        },


        //Source: http://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect
        //Expects four points each with x and y properties.  First two points form a line segment, last two points form other line segment
        //Returns an object with x and y if the line segments intersect.
        //Returns null if no intersection
        lineSegmentIntersect : function(p1, p2, p3, p4) {
            var r = {x : p2.x - p1.x, y : p2.y - p1.y},
                s = {x : p4.x - p3.x, y : p4.y - p3.y},
                rs = this.crossProduct2D(r, s),
                t, u,
                v = {x : p3.x - p1.x, y : p3.y - p1.y};
            if(rs === 0) {
                return null;
            }
            t = this.crossProduct2D(v, s) / rs;
            u = this.crossProduct2D(v, r) / rs;
            if(t < 0 || t > 1 || u < 0 || u > 1) {
                return null;
            }

            return {x: p1.x + (p2.x - p1.x) * t, y : p1.y + (p2.y - p1.y) * t};
        }
    };

    //Functions to draw nodes
    this.nodeTypes = {};

    //x: center x position
    //y: center y position
    //r: circle radius
    this.nodeTypes.circle = {
        //Draws the circle
        draw : function() {
            context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, true);
        },
        //Gets the endpoint for a connection
        connect : function(xTo, yTo) {
            var ang = getAngle(this.x, this.y, xTo, yTo);
            return [Math.cos(ang) * this.r + this.x, Math.sin(ang) * this.r + this.y];
        },
        //Bounding box for mouse over position
        getBBox : function() {
            return {
                 l : this.x - this.r,
                 r : this.x + this.r,
                 t : this.y - this.r,
                 b : this.y + this.r 
            }
        },
        //Is the point (x, y) contained by this circle?
        hitTest : function(x, y) {
            var dx = Math.abs(x - this.x);
            var dy = Math.abs(y - this.y);
            return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)) <= this.r;
        }
    }

    //x: center x position
    //y: center y position
    //w: rectangle width
    //h: rectangle height
    this.nodeTypes.rectangle = {
        //Draws the rectangle
        draw : function() {
            context.rect(this.x - (this.w / 2), this.y - (this.h / 2), this.w, this.h);
        },

        //Gets the endpoint for a connection
        connect : function(xTo, yTo) {
            var slope = 0;
            //First handle potential divide by zero error (infinite slope)
            if(this.x == xTo) {
                if(this.y < yTo) {
                    return [this.x, this.y + (this.h / 2)];
                } else {
                    return [this.x, this.y - (this.h / 2)];
                }
            }

            //Slope is this.y - yTo because coordinates get bigger as we go down, unlike cartesian plane
            slope = (yTo - this.y) / (xTo - this.x);

            //If slope <= height / width AND slope >= - height / width, then must intersect left or right edge.  Else intersects top or bottom edge.
            //Can see this by drawing line from center of rectangle to each corner.  Slope will be (sign) [height / 2 ] / (sign) [width / 2]
            if(slope <= this.h / this.w && slope >= -1 * this.h / this.w) {
                if(this.x < xTo) {  //Right edge
                    return [this.x + (this.w / 2), this.y + (slope * this.w / 2)];
                } else { //Left edge
                    return [this.x - (this.w / 2), this.y - (slope * this.w / 2)];
                }
            } else {
                if(this.y > yTo) { //Top edge
                    return [this.x - ((this.h / 2) / slope), this.y - (this.h / 2)];
                } else { //Bottom edge
                    return [this.x + ((this.h / 2) / slope), this.y + (this.h / 2)];
                }
            }
        },
        //Bounding box for mouse over position
        getBBox : function() {
            return {
                 l : this.x - (this.w / 2),
                 r : this.x + (this.w / 2),
                 t : this.y - (this.h / 2),
                 b : this.y + (this.h / 2) 
            }
        },
        //Is the point (x, y) contained by this circle?
        hitTest : function(x, y) {
            return (x > this.x - (this.w / 2) && x < (this.x + this.w / 2) &&
                    y > this.y - (this.h / 2) && y < (this.y + this.h / 2));
        }
    }

    //x: center x position
    //y: center y position
    //a: trapezoid bottom width
    //b: trapezoid top width
    //h: trapezoid height
    this.nodeTypes.trapezoid = {
        //Draws the rectangle
        draw : function() {
            var v = that.nodeTypes[this.type].vertices.apply(this),
                i, l;

            context.moveTo(v[0].x, v[0].y);
            for(var i = 1, l = v.length; i < l; i++) {
                context.lineTo(v[i].x, v[i].y);
            }
            context.lineTo(v[0].x, v[0].y);  //Close the polygon
            context.lineTo(v[1].x, v[1].y);  //Drawing this line twice helps it look better when border is thick.

        },
        //Gets the endpoint for a connection
        connect : function(xTo, yTo) {
            var v = that.nodeTypes[this.type].vertices.apply(this),
            i = 0, l, p3 = {x : this.x, y : this.y}, p4 = {x : xTo, y : yTo}, intersect;
            v = v.concat(v[0]);

            for(i = 0, l = v.length - 1; i < l; i++) {
                intersect = that.math.lineSegmentIntersect(v[i], v[i + 1], p3, p4);
                if(intersect) {
                    return [intersect.x, intersect.y];
                }
            }
            return null;
        },
        //Bounding box for mouse over position
        getBBox : function() {
            return {
                 l : this.x - Math.max(this.a, this.b) / 2,
                 r : this.x + Math.max(this.a, this.b) / 2,
                 t : this.y - this.h / 2,
                 b : this.y + this.h / 2 
            }
        },
        //Is the point (x, y) contained by this circle?
        hitTest : function(x, y) {
            var v = that.nodeTypes[this.type].vertices.apply(this);
            return that.math.pointInPoly(v.concat(v[0]), {x : x, y : y});
        },

        vertices : function() {
            return [
                {x : this.x - this.a / 2, y : this.y + this.h / 2},  //bottom-left
                {x : this.x + this.a / 2, y : this.y + this.h / 2},  //bottom-right
                {x : this.x + this.b / 2, y : this.y - this.h / 2},  //top-right
                {x : this.x - this.b / 2, y : this.y - this.h / 2}   //top-left
            ];
        }
    }

    //List of all nodes
    var _nodes = [];

    //List of all connections
    var _connections = [];

    //Add a node and render it immediately.
    this.addNode = function(node) {
        _nodes.push(node);
        _render([node]);
        _updateCanvasSize(node);
    } 

    //This is the main algorithm to draw ANY node.
    //The path/border of the node will be drawn by calling the draw method of the nodeType, using the node as the "this" parameter.
    var _renderNode = function(nodeType, node) {
        var isDrag = false, 
            isMouseOver = false,
            doFill = false;

        if(draggingNode.node === node) {
            isDrag = true;
        } else if(_arrayIndexOf.call(_mouseOverNodes, node) !== -1) {
            isMouseOver = true;
        }

        context.beginPath();

        if(isDrag && node.dragStrokeStyle) {
            context.strokeStyle = node.dragStrokeStyle;
        } else if(isMouseOver && node.hoverStrokeStyle) {
            context.strokeStyle = node.hoverStrokeStyle;
        } else if(node.strokeStyle) {
            context.strokeStyle = node.strokeStyle;
        }

        if(isDrag && node.dragStrokeWidth) {
            context.lineWidth = node.dragStrokeWidth;
        } else if(isMouseOver && node.hoverStrokeWidth) {
            context.lineWidth = node.hoverStrokeWidth;
        } else if(node.strokeWidth) {
            context.lineWidth = node.strokeWidth;
        }

        nodeType.draw.apply(node);
        context.stroke();
        if(node.text) {
            context.textAlign = "center";
            context.textBaseline = 'middle';
            context.fillStyle = defaultTextColor;
            context.font = defaultTextFont;
            context.fillText(node.text, node.x, node.y);
        }

        if(isDrag && node.dragFillStyle) {
            context.fillStyle = node.dragFillStyle;
            doFill = true;
        } else if(isMouseOver && node.hoverFillStyle) {
            context.fillStyle = node.hoverFillStyle;
            doFill = true;
        } else if(node.fillStyle) {
            context.fillStyle = node.fillStyle;
            doFill = true;
        }
        if(doFill) {
            context.fill();
        }
        context.closePath();

        //Reset defaults
        context.lineWidth = defaultStrokeWidth;
        context.strokeStyle = defaultStrokeStyle;
    }

    //Method to Render one or more nodes
    var _render = function(nodes) {
        var i, l, type;
        for(i = 0, l = nodes.length; i < l; i++) {
            type = that.nodeTypes[nodes[i].type]
            if(type) {
                _renderNode(type, nodes[i]);
            }
        }
    }

    //Add a connection between nodes and render it immediately.
    this.addConnection = function(node1, node2) {
        var c = [node1, node2];
        _connections.push(c);
        _renderConnection([c]);
    }

    //Render a connection between two nodes.
    var _renderConnection = function(connections) {
        var i, l, l1, l2, f1, f2, node1, node2;
        for(i = 0, l = connections.length; i < l; i++) {
            node1 = connections[i][0];
            node2 = connections[i][1];
            f1 = that.nodeTypes[node1.type]; 
            f2 = that.nodeTypes[node2.type];
            if(f1 && f2) {
                l1 = f1.connect.apply(node1, [node2.x, node2.y]);
                l2 = f2.connect.apply(node2, [node1.x, node1.y]);

                context.beginPath();
                context.moveTo(l1[0], l1[1]);
                context.lineTo(l2[0], l2[1]);
                context.stroke();
                context.closePath();
            }
        }
    }

    //Removes all nodes and connections, then redraws the canvas.
    this.clear = function() {
        _connections = [];
        _nodes = [];
        _mouseOverNodes = [];
        _nodeEvents = { "enter" : [], "leave" : [], "move" : []};
    }

	//Object to manage redrawing the canvas with an animation loop
	//Source for requesting next frame: http://www.html5canvastutorials.com/advanced/html5-canvas-animation-stage/
	//Does this support multiple different canvas???
	var _redraw = (function() {
		var that = this,
		newFrame = true,
		started = false,

		//Perfroms the actual refresh 
		Run = function() {
			if(newFrame) { //If we want a new frame... 
        		console.log("Redraw.  Translate: (", originX, ",", originY, ").  Zoom: ", scale);
        		console.log("Clearing: ", originX / scale, ",", originY / scale, ",", canvas.width / scale, ",", canvas.height / scale);

        		context.clearRect(originX / scale, originY / scale, canvas.width / scale, canvas.height / scale);
        		_renderConnection(_connections);
        		_render(_nodes);

        		scrollbars.redraw();
			}

			newFrame = false;

			// request new frame
			RequestNextFrame(Run);
		},

		//TODO: Figure out if this totally breaks with two different canvas!
		RequestNextFrame = function(callback) {
			var browserNextFrame = (window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
				function(callback) {
          			window.setTimeout(callback, 1000 / 60);
				});
			browserNextFrame(callback);
		};

		//Begin requesting frames
		RequestNextFrame(Run);

		return {
			//Performs a refresh by setting the flag on the next animation loop
			Do : function() {
				newFrame = true;
			}
		}
	})();

	this.redraw = function() {
		_redraw.Do();
	}

    var _updateCanvasSize = function(node) {
        nodeType = that.nodeTypes[node.type];
        bbox = nodeType.getBBox.apply(node);
        sizeX = Math.max(sizeX, bbox.r);
        sizeY = Math.max(sizeY, bbox.b);
    }

    //TODO: Calculate width/height properly, 
    //TODO: Look at more optimal way of passing alternate context to redraw (does this code have race condition??  Kinda not because JS is single-threaded...)
    this.saveImage = function() {
        var origContext = context;
        var c = document.createElement("canvas");
        var width = sizeX;
        var height = sizeY;
        c.width = width;
        c.height = height;
        context = c.getContext("2d");

        _redraw.Do();
        context = origContext;

        window.open(c.toDataURL(), "Canvas Image Data", "left=100,top=100");
    }



    var _invokeNodeMouseEvent = function(node, eventType) {
        var i, l;
        for(i = 0, l = _nodeEvents[eventType].length; i < l; i++) {
            _nodeEvents[eventType][i](node);
        }
    }

    //Get the mouse coordinates of an element on the page
    //TODO: Test if this works when any element has position: fixed
    var _getMouseCoords = function(event){
        var x = 0,
            y = 0;
            elem = this;

        do {
            x += elem.offsetLeft;
            y += elem.offsetTop;
        } while(elem = elem.offsetParent);

        return {x:event.pageX - x, 
                y:event.pageY - y}
    }

    var _translateMouseCoords = function(pos) {
        return {x : (pos.x + originX) / scale,
                y : (pos.y + originY) / scale }
         
    }

    //Object to store all functions that the node will fire on mouse enter, mouse leave, mouse move
    var _nodeEvents = { "enter" : [], "leave" : [], "move" : []};

    //Stores all nodes that the mouse is currently over.
    var _mouseOverNodes = [];

    this.addNodeEnter = function(f) {
        if(typeof(f) === "function") {
            _nodeEvents["enter"].push(f);
        }
    }

    this.addNodeLeave = function(f) {
        if(typeof(f) === "function") {
            _nodeEvents["leave"].push(f);
        }
    }

    this.addNodeMove = function(f) {
        if(typeof(f) === "function") {
            _nodeEvents["move"].push(f);
        }
    }

    //Official "index Of" funciton taken from MDN Docs.  https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
    var _arrayIndexOf = Array.prototype.indexOf || function (searchElement /*, fromIndex */ ) {  
        "use strict";  
        if (this == null) {  
            throw new TypeError();  
        }  
        var t = Object(this);  
        var len = t.length >>> 0;  
        if (len === 0) {  
            return -1;  
        }  
        var n = 0;  
        if (arguments.length > 0) {  
            n = Number(arguments[1]);  
            if (n != n) { // shortcut for verifying if it's NaN  
                n = 0;  
            } else if (n != 0 && n != Infinity && n != -Infinity) {  
                n = (n > 0 || -1) * Math.floor(Math.abs(n));  
            }  
        }  
        if (n >= len) {  
            return -1;  
        }  
        var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);  
        for (; k < len; k++) {  
            if (k in t && t[k] === searchElement) {  
                return k;  
            }  
        }  
        return -1;  
    }

    var scrollbars = {
        showVertical : true,
        showHorizontal : true,
        margin : 8, //In pixels, assume same margin for all four sides
        width : 15, //In pixels, assume same scrollbar width for both horizontal and vertical 
        horizDragPos : -1, //In pixels, last position of dragging horizontal scrollbar.  -1 means no drag.
        vertDragPos : -1, //In pixels, last position of dragging horizontal scrollbar.  -1 means no drag.
        hoverVert : false,
        hoverHoriz : false,
		isDrag : false,

        getHorizBarCoords : function() {
            return [ originX + this.margin,  //Left
                     originY + canvas.height - this.margin - this.width, //Top
                     canvas.width - this.width - 2 * this.margin, //Width
                     this.width //Height
                   ];
        },

        getVertBarCoords : function() {
            return [ originX + canvas.width - this.margin - this.width,  //Left
                     originY + this.margin, //Top
                     this.width, //Width
                     canvas.height - this.width - 2 * this.margin //Height
                   ];
        },

        getHorizThumbCoords : function() {
            var startOffset = originX / sizeX,
                length = canvas.width / sizeX;
                bar = this.getHorizBarCoords();
            return [bar[0] + startOffset * bar[2], bar[1], length * bar[2], bar[3]];
        },

        getVertThumbCoords : function() {
            var startOffset = originY / sizeY,
                length = canvas.height / sizeY;
                bar = this.getVertBarCoords();
            return [bar[0], bar[1] + startOffset * bar[3], bar[2], length * bar[3]];
        },

        hitTestHorizThumb : function(pos) {
            var hCoords = this.getHorizThumbCoords();
            return (pos.x >= hCoords[0] && pos.y >= hCoords[1] && pos.x <= hCoords[0] + hCoords[2] && pos.y <= hCoords[1] + hCoords[3]);
        },

        hitTestVertThumb : function(pos) {
            var vCoords = this.getVertThumbCoords();
            return (pos.x >= vCoords[0] && pos.y >= vCoords[1] && pos.x <= vCoords[0] + vCoords[2] && pos.y <= vCoords[1] + vCoords[3]);
        },

        beginDrag : function(pos) {
			this.isDrag = false;
            if(this.hitTestHorizThumb(pos)) {
                this.horizDragPos = pos.x;
                canvas.style.cursor = "move";
				this.isDrag = true;
            }

            if(this.hitTestVertThumb(pos)) {
                this.vertDragPos = pos.y;
                canvas.style.cursor = "move";
				this.isDrag = true;
            }
			return this.isDrag;
        },

        updateMove : function(pos) {
            var prevHoverHoriz = this.hoverHoriz,
                prevHoverVert = this.hoverVert;

            //Need to test that we are on the thumbnail AND that we are not already dragging the other scrollbar
            if(this.hitTestHorizThumb(pos) && this.vertDragPos === -1) {
                this.hoverHoriz = true;
            } else if(this.hitTestVertThumb(pos) && this.horizDragPos === -1) {
                this.hoverVert = true;
            } else {
                //WARNING: This fails if we have no margin and leave the scrollbar.  This should be fixed.
                if(this.horizDragPos === -1) {
                    this.hoverHoriz = false;
                }
                if(this.vertDragPos === -1) {
                    this.hoverVert = false;
                }
            }

            this.updateDrag(pos);

            if(prevHoverHoriz !== this.hoverHoriz || prevHoverVert !== this.hoverVert) {
                _redraw.Do();  //Must redraw entire canvas or else the scrollbars will get darker each time we hover over.
            }
        },

        updateDrag : function(pos) {
            var thumbDelta = 0, 
                canvasDelta = 0,
                barExtraSize = 0,
                canvasExtraSize = 0;
            if(this.horizDragPos > -1) {
                thumbDelta = pos.x - this.horizDragPos;
                barExtraSize = this.getHorizBarCoords()[2] - this.getHorizThumbCoords()[2];
                canvasExtraSize = sizeX - canvas.width;
                canvasDelta = (thumbDelta / barExtraSize) * canvasExtraSize;

                //Bugfix: Holding scrollbar and going past the end would cause jitter.
                //TODO: Fix better....
                if((canvasDelta > 0 && (originX + canvas.width >= sizeX)) ||
                    (canvasDelta < 0 && originX <= 0)) {
                    return;
                }
                that.moveRight(canvasDelta)
                this.horizDragPos = pos.x + canvasDelta;
            }
            if(this.vertDragPos > -1) {
                thumbDelta = pos.y - this.vertDragPos;
                barExtraSize = this.getVertBarCoords()[3] - this.getVertThumbCoords()[3];
                canvasExtraSize = sizeY - canvas.height;
                canvasDelta = (thumbDelta / barExtraSize) * canvasExtraSize;

                //Bugfix: Holding scrollbar and going past the end would cause jitter.
                //TODO: Fix better....
                if((canvasDelta > 0 && (originY + canvas.height >= sizeY)) ||
                    (canvasDelta < 0 && originY <= 0)) {
                    return;
                }
                that.moveDown(canvasDelta); 
                this.vertDragPos = pos.y + canvasDelta;
            }
        },

        endDrag : function() {
			this.isDrag = false;
            this.horizDragPos = -1,
            this.vertDragPos = -1
            canvas.style.cursor = "auto";
            if(this.hoverHoriz || this.hoverVert) {
                this.hoverHoriz = false;
                this.hoverVert = false;
                _redraw.Do();  //Redraw required since we may need to "clear" our scrollbars from being hovered
            }
        },

        redraw : function() {
            var horizWhole = this.getHorizBarCoords(),
                vertWhole = this.getVertBarCoords(),
                horizThumb = this.getHorizThumbCoords(),
                vertThumb = this.getVertThumbCoords(),
                thumbOffStrokeStyle = "rgba(0, 255, 0, 0.5)",
                thumbOffFillStyle = "rgba(0, 128, 0, 0.5)",
                barOffStrokeStyle = "rgba(0, 200, 0, 0.2)",
                barOffFillStyle = "rgba(0, 100, 0, 0.09)",
                thumbOnStrokeStyle = "rgba(0, 255, 0, 1)",
                thumbOnFillStyle = "rgba(0, 128, 0, 1)",
                barOnStrokeStyle = "rgba(0, 200, 0, 0.4)",
                barOnFillStyle = "rgba(0, 100, 0, 0.18)",
                xRequiresScroll = (sizeX > canvas.width),
                yRequiresScroll = (sizeY > canvas.height);


            if(this.showHorizontal && xRequiresScroll) {
                context.strokeWidth = 2;
                context.strokeStyle = (this.hoverHoriz ? barOnStrokeStyle : barOffStrokeStyle);
                context.fillStyle = (this.hoverHoriz ? barOnFillStyle : barOffFillStyle);
                context.fillRect.apply(context, horizWhole);
                context.strokeRect.apply(context, horizWhole);

                context.strokeWidth = 4;
                context.strokeStyle = (this.hoverHoriz ? thumbOnStrokeStyle : thumbOffStrokeStyle);
                context.fillStyle = (this.hoverHoriz ? thumbOnFillStyle : thumbOffFillStyle);
                context.fillRect.apply(context, horizThumb);
                context.strokeRect.apply(context, horizThumb);
            }

            if(this.showVertical && yRequiresScroll) {
                context.strokeWidth = 2;
                context.strokeStyle = (this.hoverVert ? barOnStrokeStyle : barOffStrokeStyle);
                context.fillStyle = (this.hoverVert ? barOnFillStyle : barOffFillStyle);
                context.fillRect.apply(context, vertWhole);
                context.strokeRect.apply(context, vertWhole);

                context.strokeWidth = 4;
                context.strokeStyle = (this.hoverVert ? thumbOnStrokeStyle : thumbOffStrokeStyle);
                context.fillStyle = (this.hoverVert ? thumbOnFillStyle : thumbOffFillStyle);
                context.fillRect.apply(context, vertThumb);
                context.strokeRect.apply(context, vertThumb);
            }

            
            //Reset defaults
            context.lineWidth = defaultStrokeWidth;
            context.strokeStyle = defaultStrokeStyle;
        }
    }

	//The current node being dragged.
	//Consider merging this and scrollbars into draggable object prototype to share common code
	var draggingNode = {
        prevXPos : -1, //In pixels, last position of dragging horizontal scrollbar.  -1 means no drag.
        prevYPos : -1, //In pixels, last position of dragging horizontal scrollbar.  -1 means no drag.
		node : null,  //The node we are dragging.
		isDrag : false,

        beginDrag : function(pos) {
			this.node = _mouseOverNodes && _mouseOverNodes[0];
			if(this.node) {
				this.prevXPos = pos.x;
				this.prevYPos = pos.y;

				canvas.style.cursor = "move";

				this.isDrag = true;

				_redraw.Do();
            }

			return this.isDrag;
        },

		updateDrag : function(pos) {
            var moveX = pos.x - this.prevXPos,
                moveY = pos.y - this.prevYPos,
				changed = false;

			if(!this.isDrag) { return; }

			if(Math.abs(moveX) > 2) {
				this.node.x += moveX;
				this.prevXPos += moveX;
				changed = true;
			}
			if(Math.abs(moveY) > 2) {
				this.node.y += moveY;
				this.prevYPos += moveY;
				changed = true;
			}

			if(changed) {
				_redraw.Do();  
			}
        },

		endDrag : function () { 
            this.prevXPos = -1,
            this.prevYPos = -1
			this.isDrag = false;
            if(this.node) {
                this.node = null;
                _redraw.Do();  
            }
		}
	}


	//Object to handle logic around dragging the Canvas 
	var draggingCanvas = {
        prevXPos : -1, //In pixels, last position of dragging horizontal scrollbar.  -1 means no drag.
        prevYPos : -1, //In pixels, last position of dragging horizontal scrollbar.  -1 means no drag.
		isDrag : false,

        beginDrag : function(pos) {
			this.isDrag = true;
			this.prevXPos = pos.x;
			this.prevYPos = pos.y;
			canvas.style.cursor = "move";
			return this.isDrag;
        },

		updateDrag : function(pos) {
            var moveX = pos.x - this.prevXPos,
                moveY = pos.y - this.prevYPos,
				changed = false;

			if(!this.isDrag) { return; }

			if(Math.abs(moveX) > 2) {
				this.prevXPos = pos.x + moveX;  //New Starting Mouse Position is current mouse position AND amount we translated canvas by
				that.moveRight(moveX);
				changed = true;
			}
			if(Math.abs(moveY) > 2) {
				this.prevYPos = pos.y + moveY;
				that.moveDown(moveY);
				changed = true;
			}

			if(changed) {
				_redraw.Do();  
			}
        },

		endDrag : function () { 
			this.isDrag = false;
			canvas.style.cursor = "auto";
            this.prevXPos = -1,
            this.prevYPos = -1
		}
	}

    this.moveLeft = function(delta) {
        if(delta < 0) {
            this.moveRight(delta * -1);
            return;
        }
        delta = Math.min(delta, originX);
        context.translate(delta / scale, 0);
        originX -= delta;
        _redraw.Do();
    }

    this.moveUp = function(delta) {
        if(delta < 0) {
            this.moveDown(delta * -1);
            return;
        }
        delta = Math.min(delta, originY);
        context.translate(0, delta / scale);
        originY -= delta;
        _redraw.Do();
    }

    this.moveDown = function(delta) {
        var actualMaxY = (sizeY - canvas.height) * scale + (scale - 1) * canvas.height;
        actualMaxY = Math.max(0, actualMaxY);
        if(delta < 0) {
            this.moveUp(delta * -1);
            return;
        }
        delta = Math.min(delta, actualMaxY - originY);
        context.translate(0, delta / scale * -1);
        originY += delta;
        _redraw.Do();
    }

    this.moveRight = function(delta) {
        var actualMaxX = (sizeX - canvas.width) * scale + (scale - 1) * canvas.width;
        actualMaxX = Math.max(0, actualMaxX);
        if(delta < 0) {
            this.moveLeft(delta * -1);
            return;
        }
        delta = Math.min(delta, actualMaxX - originX);
        context.translate(delta / scale * -1, 0);
        originX += delta;
        _redraw.Do();
    }

    this.zoomOut = function() {
        that.zoom(0.8);
    }

    this.zoomIn = function() {
        that.zoom(1.25);
    }

    this.zoom = function(scaleFactor) {
        //First translate back to 0, 0
        context.translate(-1 * originX / scale, -1 * originY / scale);
        //Now scale
        scale *= scaleFactor;
        context.scale(scaleFactor, scaleFactor);
        //Now translate back to place
        context.translate(originX / scale, originY / scale);
        _redraw.Do();
    }

    this.reset = function(scaleFactor) {
        scale = 1;
        originX = 0;
        originY = 0;

        //Use identity matrix to reset transform
        context.setTransform(1, 0, 0, 1, 0, 0);
        _redraw.Do();
    }


    this.resize = function(newWidth, newHeight) {
        originX = 0;
        originY = 0;
        canvas.width = newWidth;
        canvas.height = newHeight;
        _redraw.Do();
    }

    var canvasMouseEvents = function() {
        //Generic method to attach an event to a DOM element.
        var _domAddEvent = function(elem, event, fn) {
            if(elem.addEventListener) {
                elem.addEventListener(event, fn, false);
            } else if(elem.attachEvent) {
                elem.attachEvent('on' + event, fn);
            } else {
                elem["on" + event] = fn;
            }
        }

        //Function to verify which nodes should fire mouseenter, mouseleave, mouseover events.
        var _handleNodeMouseEvents = function(e) {
            e = e || window.event;
            var pos = _translateMouseCoords(_getMouseCoords.call(canvas, e)),
                localMouseOver = [],
                nodePos = -1,
                eventType = "",
                i = 0,
                l = 0,
                nodeType, 
                bbox,
                isEnter,
                isLeave;


            //First, update dragging.
            //If not dragging any element, then refresh the scrollbars
            if(draggingNode.isDrag) {
                draggingNode.updateDrag(pos);
            } else if(draggingCanvas.isDrag) {
                draggingCanvas.updateDrag(pos);
            } else {
                scrollbars.updateMove(pos);
            }

            for(i = 0, l = _nodes.length; i < l; i++) {
                nodeType = that.nodeTypes[_nodes[i].type];
                bbox = nodeType.getBBox.apply(_nodes[i]);
                
                //Is the node inside the bounding box?  If so, also check the hitTest function
                if(pos.x >= bbox.l && pos.x <= bbox.r && 
                   pos.y >= bbox.t && pos.y <= bbox.b && 
                   nodeType.hitTest.call(_nodes[i], pos.x, pos.y)) {
                      localMouseOver.push(_nodes[i]);
                      nodePos = _arrayIndexOf.call(_mouseOverNodes, _nodes[i]);

                      eventType = "move";

                      //Mouse enter
                      if(nodePos === -1) {
                          _mouseOverNodes.push(_nodes[i]);
                          eventType = "enter";
                          isEnter = true;
                      } else {
                          eventType = "move";
                      }

                      _invokeNodeMouseEvent(_nodes[i], eventType);
                }
            }

            //We have left a previous node if we didn't visit it during this mouse event.
            for(i = _mouseOverNodes.length - 1; i >= 0; i--) {
                if(_arrayIndexOf.call(localMouseOver, _mouseOverNodes[i]) === -1) {
                    _invokeNodeMouseEvent(_mouseOverNodes[i], "leave");
                    _mouseOverNodes.splice(i, 1);
                    isLeave = true;
                }
            }

            if(isEnter || isLeave) {
                _redraw.Do();
            }
        }

        //When leaving the canvas, fire all leave node mouse events
        var _leaveNodeMouseEvents = function(e) {
            e = e || window.event;
            var i, l;

            for(i = 0, l = _mouseOverNodes.length; i < l; i++) {
                _invokeNodeMouseEvent(_mouseOverNodes[i], "leave");
            }
            _mouseOverNodes = []; 

            //Prevent scrollbars from dragging if leave canvas and come back in.
            scrollbars.endDrag();
            draggingNode.endDrag();
            draggingCanvas.endDrag();
        }

        //Mouse down
        _handleMouseDown = function(e) {
            var pos = _translateMouseCoords(_getMouseCoords.call(canvas, e)),
                dragPerformed = scrollbars.beginDrag(pos);

            if(!dragPerformed) { 
                dragPerformed =	draggingNode.beginDrag(pos);
            }

            if(!dragPerformed) {
                dragPerformed =	draggingCanvas.beginDrag(pos);
            }

            //Prevent change of cursor to selection.  Code from: http://stackoverflow.com/questions/2659999/html5-canvas-hand-cursor-problems
            e.preventDefault();
            e.stopPropagation();
        }

        _handleMouseUp = function(e) {
            scrollbars.endDrag();
            draggingNode.endDrag();
            draggingCanvas.endDrag();
        }

        //Attach events to canvas mouse behaviour
        _domAddEvent(canvas, "mousemove", _handleNodeMouseEvents);
        _domAddEvent(canvas, "mouseout", _leaveNodeMouseEvents);
        _domAddEvent(canvas, "mousedown", _handleMouseDown);
        _domAddEvent(canvas, "mouseup", _handleMouseUp);
    }
    canvasMouseEvents();


    //Create a tree layout
    //Inspired by dot algorithm, but much, much, simpler.
    //http://www.graphviz.org/Documentation/TSE93.pdf
    this.transitionSimpleTree = function(debug) {
        var _tmpNodes;  //Local copy of nodes.  
        var _tmpConns;  //Local copy of connections
        var _nodesep = 50; //Horizontal separation
        var _ranksep = 100; //Vertical separation
        var _topMargin = 20;  //Top margin to display nodes from.

        //Create the local copy of data to be worked on.
        var createCopies = function() {
            var n1, n2, i, l;
            _tmpNodes = [];
            _tmpConns = [];
            for(i = 0, l = nodes.length; i < l; i++) {
                _tmpNodes.push( { "level" : -1, "ranked" : false, "x" : 0, "y" : 0, "origNode" : _nodes[i] });
            }

            for(i = 0, l = _connections.length; i < l; i++) {
                n1 = _connections[i][0];
                n2 = _connections[i][1];

                for(var j = 0; j < _tmpNodes.length; j++) {
                    if(n1 === _tmpNodes[j].origNode) {
                        n1 = _tmpNodes[j];
                    }
                    if(n2 === _tmpNodes[j].origNode) {
                        n2 = _tmpNodes[j];
                    }
                }

                _tmpConns.push( { "from" : n1, "to" : n2, "origConn" : _connections[i] } );
            }
        }
        //The algorithm is done, apply the new x, y, positions.
        var updateNodes = function() {
            var i, l, n;

            for(i = 0, l = _tmpNodes.length; i < l; i++) {
                n = _tmpNodes[i];
                n.y = _topMargin + _ranksep * n.level;
            }

            for(i = 0, l = _tmpNodes.length; i < l; i++) {
                n = _tmpNodes[i];
                if(n.origNode) {
                    //n.origNode.x = n.x;  //NOT YET READY.
                    n.origNode.y = n.y;
                }
            }
        }

        //Assign the vertical rank to each node.
        //Algorithm inspired by topological sort.
        //Assumes that graph is already acyclic.
        var rank = function() {
            var numRemaining = _tmpNodes.length,
                currLevel = 0,
                anyIncomingEdge = false,
                nodesToRank = [],
                i, j, l1, l2;

            while(numRemaining > 0) {
                for(i = 0, l1 = _tmpNodes.length; i < l1; i++) {
                    //Already mached.  Do not process.
                    if(_tmpNodes[i].ranked) {
                        continue;
                    }

                    //Check if the current node has any incoming edge whose incoming node is not processed.  If so, we must wait to process it. 
                    anyIncomingEdge = false;
                    for(j = 0, l2 = _tmpConns.length; j < l2; j++) {
                        if(_tmpConns[j].to === _tmpNodes[i] && !_tmpConns[j].from.ranked) {
                            anyIncomingEdge = true;
                            break;
                        }
                    }
                    if(!anyIncomingEdge) {
                        _tmpNodes[i].level = currLevel;
                        nodesToRank.push(_tmpNodes[i]);
                        numRemaining--;
                    }
                }

                //Process all nodes found
                for(i = 0, l = nodesToRank.length; i < l; i++) {
                    nodesToRank[i].ranked = true;
                }
                nodesToRank = [];
                currLevel++;
            }
        }
        var ordering = function() {
        }
        var position = function() {
        }
        var makeSplines = function() {
        }

        createCopies();

        if(debug) {
            console.log("Node Copies");
            console.dir(_tmpNodes);
            console.log("Connection Copies");
            console.dir(_tmpConns);
        }

        rank();
        if(debug) {
            console.log("After ranking nodes");
            console.dir(_tmpNodes);
        }


        ordering();
        position();
        makeSplines();
        updateNodes();
        that.redraw();
    }
}
