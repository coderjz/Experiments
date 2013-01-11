var circleData = circleData || {};

circleData.numSymbols = 6;
circleData.symbolRadius = 30;
circleData.distanceBetween = 0;
circleData.distanceOrigin = 20;
circleData.shapeType = "circle";
circleData.startColor = "#FFFFFF";
circleData.endColor = "#FFFFFF";
circleData.canvas = null;
circleData.context = null;

circleData.setCanvas = function(id) {
    var elem, c;
    elem = document.getElementById(id);
    if(!elem)  {
        return;
    }

    c = elem.getContext && elem.getContext('2d');
    if(!c) {
        return;
    }

    circleData.canvas = elem;
    circleData.context = c;
}

circleData.getCenter = function() {
    var center = null;
    if(circleData.canvas) {
        center = [circleData.canvas.width / 2, circleData.canvas.height / 2];
    }
    return center;
}

//This is the minimum distance that 
circleData.minDistance = function() {
    return Math.ceil(Math.max(2 * circleData.symbolRadius, (circleData.numSymbols * circleData.symbolRadius) / Math.PI));
}

circleData.draw = function() {
    var c = circleData,
        center = c.getCenter(),
        dmin = circleData.minDistance(),
        angle, x, y,
        i;

    if(!center) { 
        return;
    }

    circleData.clear();

    for(i = 0; i < c.numSymbols; i++) {
        angle = (i / c.numSymbols) * 2 * Math.PI;
        x = center[0] + (dmin + c.distanceOrigin) * Math.cos(angle);
        y = center[1] + (dmin + c.distanceOrigin) * Math.sin(angle);
        c.context.beginPath();
        c.context.arc(x, y, circleData.symbolRadius, 0, 2 * Math.PI, true);
        c.context.stroke();
        c.context.closePath();
    }
}

circleData.clear = function() {
    if(!circleData.context) {
        return;
    }
    //Use identity matrix to reset transform
    circleData.context.clearRect(0, 0, circleData.canvas.width, circleData.canvas.height);

}
