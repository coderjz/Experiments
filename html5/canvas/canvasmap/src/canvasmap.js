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

    //Functions to draw nodes
    this.nodeTypes = {};

    this.nodeTypes.circle = {
        //Draws the circle
        draw : function() {
            context.beginPath();
            if(this.strokeStyle) {
                context.strokeStyle = this.strokeStyle;
            }
            if(this.strokeWidth) {
                context.lineWidth = this.strokeWidth;
            }
            context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, true);
            context.stroke();
            if(this.text) {
                context.textAlign = "center";
                context.textBaseline = 'middle';
                var center = that.nodeTypes[this.type].center.apply(this);
                context.fillStyle = defaultTextColor;
                context.font = defaultTextFont;
                context.fillText(this.text, center[0], center[1]);
            }
            if(this.fillStyle) {
                context.fillStyle = this.fillStyle;
                context.fill();
            }
            context.closePath();

            //Reset defaults
            context.lineWidth = defaultStrokeWidth;
            context.strokeStyle = defaultStrokeStyle;
        },
        //Gets the endpoint for a connection
        connect : function(xFrom, yFrom, xTo, yTo) {
            var ang = getAngle(this.x, this.y, xTo, yTo);
            return [Math.cos(ang) * this.r + this.x, Math.sin(ang) * this.r + this.y];
        },
        //Gets the center point
        center : function() {
            return [this.x, this.y];
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

    this.nodeTypes.rectangle = {
        //Draws the rectangle
        draw : function() {
            context.beginPath();
            if(this.strokeStyle) {
                context.strokeStyle = this.strokeStyle;
            }
            if(this.strokeWidth) {
                context.lineWidth = this.strokeWidth;
            }
            context.rect(this.x, this.y, this.w, this.h);
            context.stroke();
            if(this.text) {
                context.textAlign = "center";
                context.textBaseline = 'middle';
                var center = that.nodeTypes[this.type].center.apply(this);
                context.fillStyle = defaultTextColor;
                context.fillText(this.text, center[0], center[1]);
            }
            if(this.fillStyle) {
                context.fillStyle = this.fillStyle;
                context.fill();
            }
            context.closePath();

            //Reset defaults
            context.lineWidth = defaultStrokeWidth;
            context.strokeStyle = defaultStrokeStyle;
        },

        //Gets the endpoint for a connection
        connect : function(xFrom, yFrom, xTo, yTo) {
            var ang = getAngle(xFrom, yFrom, xTo, yTo);

            //TODO: Fix this
            //Suggested algorithm: http://community.topcoder.com/tc?module=Static&d1=tutorials&d2=geometry2
            //
            //OR: http://stackoverflow.com/questions/1585525/how-to-find-the-intersection-point-between-a-line-and-a-rectangle
/*The slope of the line is s = (Ay - By)/(Ax - Bx).

If -h/2 <= s * w/2 <= h/2 then the line intersects:
The right edge if Ax > Bx
The left edge if Ax < Bx.
If -w/2 <= (h/2)/s <= w/2 then the line intersects:
The top edge if Ay > By
The bottom edge if Ay < By.
*/
            return [xFrom + Math.cos(ang) * this.w / 2,
                    yFrom + Math.sin(ang) * this.h / 2];

        },
        //Gets the center point
        center : function() {
            return [this.x + this.w / 2, this.y + this.h / 2];
        },

        //Bounding box for mouse over position
        getBBox : function() {
            return {
                 l : this.x - this.w,
                 r : this.x + this.w,
                 t : this.y - this.h,
                 b : this.y + this.h 
            }
        },
        //Is the point (x, y) contained by this circle?
        hitTest : function(x, y) {
            return (x > this.x && x < this.x + this.w &&
                    y > this.y && y < this.y + this.h);
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

    //Method to Render one or more nodes
    var _render = function(nodes) {
        var i, l;
        for(i = 0, l = nodes.length; i < l; i++) {
            if(that.nodeTypes[nodes[i].type]) {
                that.nodeTypes[nodes[i].type].draw.apply(nodes[i]);
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
        var i, l, c1, c2, l1, l2, f1, f2, node1, node2;
        for(i = 0, l = connections.length; i < l; i++) {
            node1 = connections[i][0];
            node2 = connections[i][1];
            f1 = that.nodeTypes[node1.type]; 
            f2 = that.nodeTypes[node2.type];
            if(f1 && f2) {
                c1 = f1.center.apply(node1);
                c2 = f2.center.apply(node2);
                l1 = f1.connect.apply(node1, c1.concat(c2));
                l2 = f2.connect.apply(node2, c2.concat(c1));

                context.beginPath();
                context.moveTo(l1[0], l1[1]);
                context.lineTo(l2[0], l2[1]);
                context.stroke();
                context.closePath();
            }
        }
    }

    //Redraw everything
    this.redraw = function() {
        console.log("Redraw.  Translate: (", originX, ",", originY, ").  Zoom: ", scale);
        console.log("Clearing: ", originX / scale, ",", originY / scale, ",", canvas.width / scale, ",", canvas.height / scale);

        context.clearRect(originX / scale, originY / scale, canvas.width / scale, canvas.height / scale);
        _renderConnection(_connections);
        _render(_nodes);
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

        that.redraw();
        context = origContext;

        window.open(c.toDataURL(), "Canvas Image Data", "left=100,top=100");
    }

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
            bbox;

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
            }
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

    this.moveLeft = function(delta) {
        delta = Math.min(delta, originX);
        context.translate(delta / scale, 0);
        originX -= delta;
        that.redraw();
    }

    this.moveUp = function(delta) {
        delta = Math.min(delta, originY);
        context.translate(0, delta / scale);
        originY -= delta;
        that.redraw();
    }

    this.moveDown = function(delta) {
        var actualMaxY = (sizeY - canvas.height) * scale + (scale - 1) * canvas.height;
        delta = Math.min(delta, actualMaxY - originY);
        context.translate(0, delta / scale * -1);
        originY += delta;
        that.redraw();
    }

    this.moveRight = function(delta) {
        var actualMaxX = (sizeX - canvas.width) * scale + (scale - 1) * canvas.width;
        delta = Math.min(delta, actualMaxX - originX);
        context.translate(delta / scale * -1, 0);
        originX += delta;
        that.redraw();
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
        that.redraw();
    }

    this.reset = function(scaleFactor) {
        scale = 1;
        originX = 0;
        originY = 0;

        //Use identity matrix to reset transform
        context.setTransform(1, 0, 0, 1, 0, 0);
        that.redraw();
    }


    //Attach events to canvas mouse behaviour
    _domAddEvent(canvas, "mousemove", _handleNodeMouseEvents);
    _domAddEvent(canvas, "mouseout", _leaveNodeMouseEvents);
}
