var circleData = circleData || {};

circleData.numSymbols = 6;
circleData.symbolRadius = 30;
circleData.distanceOrigin = 20;
circleData.shapeType = "circle";
circleData.startColor = {"r" : 255, "g" : 255, "b" : 255};
circleData.endColor = {"r" : 255, "g" : 255, "b" : 255};
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

circleData.draw = function(angleDelta) {
    var c = circleData,
        center = c.getCenter(),
        dmin = circleData.minDistance(),
        angle, x, y,
        rgbDelta,
        i;

    if(!center) { 
        return;
    }

    if(!angleDelta) {
        angleDelta = 0;
    }

    circleData.clear();

    rgbDelta = {
        r : ((circleData.endColor.r - circleData.startColor.r) /  Math.max(c.numSymbols - 1, 1)),
        g : ((circleData.endColor.g - circleData.startColor.g) /  Math.max(c.numSymbols - 1, 1)),
        b : ((circleData.endColor.b - circleData.startColor.b) /  Math.max(c.numSymbols - 1, 1))
    }

    for(i = 0; i < c.numSymbols; i++) {
        angle = angleDelta + ((i / c.numSymbols) * 2 * Math.PI);
        x = center[0] + (dmin + c.distanceOrigin) * Math.cos(angle);
        y = center[1] + (dmin + c.distanceOrigin) * Math.sin(angle);
        c.context.beginPath();
        c.context.arc(x, y, circleData.symbolRadius, 0, 2 * Math.PI, true);
        c.context.stroke();

        c.context.fillStyle = "rgb(" + (circleData.startColor.r + Math.floor(rgbDelta.r * i)).toString() + "," +
                                       (circleData.startColor.g + Math.floor(rgbDelta.g * i)).toString() + "," +   
                                       (circleData.startColor.b + Math.floor(rgbDelta.b * i)).toString() + ")";

        c.context.fill();
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


circleData.spin = function(time, numSpins, tween) {    
    var framesPerSec = 60,
        currIteration = 1,
        numIterations = time * framesPerSec,
        radianDelta = Math.PI * 2 * (numSpins / numIterations),

    f = function() {
        if(currIteration <= numIterations) {
            circleData.draw(radianDelta * currIteration);
            currIteration++;
            setTimeout(f, 1000 / framesPerSec);
        }
    }
    f();
}
