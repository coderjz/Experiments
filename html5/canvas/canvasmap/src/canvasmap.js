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
        }
    }

    //List of all nodes
    var _nodes = [];

    //List of all connections
    var _connections = [];

    this.addNode = function(node) {
        _nodes.push(node);
        _render([node]);
    } 

    var _render = function(nodes) {
        for(var i = 0, l = nodes.length; i < l; i++) {
            if(that.nodeTypes[nodes[i].type]) {
                that.nodeTypes[nodes[i].type].draw.apply(nodes[i]);
            }
        }
    }

    this.addConnection = function(node1, node2) {
        _connections.push([node1, node2]);
        _renderConnection(node1, node2);
    }

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
}
