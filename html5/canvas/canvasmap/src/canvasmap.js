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

    //Functions to draw nodes
    this.nodeTypes = {};

    this.nodeTypes.circle = {
        //Draws the circle
        draw : function() {
            context.beginPath();
            context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, true);
            context.stroke();
            if(this.fill) {
                context.fill();
            }
            context.closePath();
        },
        //Gets the endpoint for a connection
        connect : function(xTo, yTo) {
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

    //List of all nodes
    var _nodes = [];

    //List of all connections
    var _connections = [];

    //Add a node and render it immediately.
    this.addNode = function(node) {
        _nodes.push(node);
        _render([node]);
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
        _connections.push([node1, node2]);
        _renderConnection(node1, node2);
    }

    //Render a connection between two nodes.
    var _renderConnection = function(node1, node2) {
        var f1 = that.nodeTypes[node1.type], 
            f2 = that.nodeTypes[node2.type],
            c1, c2, l1, l2;
        if(f1 && f2) {
            c1 = f1.center.apply(node1);
            c2 = f2.center.apply(node2);
            l1 = f1.connect.apply(node1, c2);
            l2 = f2.connect.apply(node2, c1);

            context.beginPath();
            context.moveTo(l1[0], l1[1]);
            context.lineTo(l2[0], l2[1]);
            context.stroke();
            context.closePath();
        }
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
        var pos = _getMouseCoords.call(canvas, e),
            localMouseOver = [],
            nodePos = -1,
            eventType = "",
            i = 0,
            l = 0,
            nodeType, 
            bbox;

        for(i = 0, l = _nodes.length; i < l; i++) {
            nodeType = that.nodeTypes[_nodes[i].type];
            if(typeof(nodeType.getBBox) !== "function" || typeof(nodeType.hitTest) !== "function") {
                continue;
            }
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
        } while(elem = elem.offsetParent)

        return {x:event.pageX - x, 
                y:event.pageY - y}
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


    //Attach events to canvas mouse behaviour
    _domAddEvent(canvas, "mousemove", _handleNodeMouseEvents);
    _domAddEvent(canvas, "mouseout", _leaveNodeMouseEvents);
}
