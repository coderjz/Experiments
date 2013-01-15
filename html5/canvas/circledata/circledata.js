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



circleData.spin = {
    timer : null,
    time : 0,
    isSpin : false,
    isShort : false,
    currFrame : 0,
    numFrames : 0,
    framesPerSec : 60,
    speed : 60,  //60 = 1 revolution / second.  If negative, goes counter-clockwise
    numSpins : 0,
    radianDelta : 0,
    tween : null
}

circleData.spin.toggle = function() {
    var s = circleData.spin;
    if(s.isSpin) {
        s.isSpin = false;
        clearTimeout(s.timer);
    } else {
        s.isSpin = true;
        s.isShort = false;
        s.timer = setTimeout(circleData.spin.getNext, 1000 / s.framesPerSec);
    }
}

circleData.spin.short = function(time) {    
    var s = circleData.spin;

    s.numIterations = time * framesPerSec;
    s.currFrame = 0;
    s.isShort = true;
    s.isSpin = true;
    s.getNext();
}

circleData.spin.getNext = function() {
    var s = circleData.spin;

    s.radianDelta += (2 * Math.PI / s.speed);

    if(s.radianDelta > 0) {
        while(s.radianDelta >= 2 * Math.PI) {
            s.radianDelta -= 2 * Math.PI;
        }
    } else {
        while(s.radianDelta <= -2 * Math.PI) {
            s.radianDelta += 2 * Math.PI;
        }
    }

    circleData.draw(s.radianDelta);
    if(s.isShort) {
        currIteration++;
    }
    if(s.isSpin && (!s.isShort || currIteration < numIterations)) {
        s.timer = setTimeout(circleData.spin.getNext, 1000 / s.framesPerSec);
    }
}
