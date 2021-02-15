async function setupCamera() {
    video = document.getElementById('video');

    console.log(navigator);
    console.log(navigator.mediaDevices);

    stream = await navigator.mediaDevices.getUserMedia({
        'audio': false,
        'video': {
        facingMode: 'user',
        width: 800,
        height: 600
        },
    });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
        resolve(video);
        };
    });
}

function updateCamera()
{
    ctx = canvas.getContext('2d');
    ctx.drawImage(
        video, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';

    let inferenceRectSide = 28*4;
    let x0 = canvas.width/2 - inferenceRectSide/2;
    let x1 = canvas.width/2 + inferenceRectSide/2;
    let y0 = canvas.height/2 - inferenceRectSide/2;
    let y1 = canvas.height/2 +   inferenceRectSide/2;

    inputCtx = inputCanvas.getContext('2d');
    inputCtx.drawImage(canvas, x0, y0, inferenceRectSide, inferenceRectSide, 0, 0, inputWidth, inputHeight);
    
    imageData = inputCtx.getImageData(0,0,inputWidth, inputHeight)
    imageDataArray = imageData.data;
    
    for (let j = 0; j < inputHeight; ++j)
    {
        for (let i = 0; i < inputWidth; ++i)
        {

            let ix = (j*inputWidth + i) * 4;
            let val = 1.0 - (imageDataArray[ix] + imageDataArray[ix+1] + imageDataArray[ix+2]) / 3 / 255.0; 
            if (val < 0.25) 
            {
                val = 0;
            }
            val = val * 1.5;
            if (val > 1) 
            {
                val = 1;
            }
            X[inputWidth*j+i] = val;
            imageDataArray[ix] = 255 * val;
            imageDataArray[ix+1] = 255 * val;
            imageDataArray[ix+2] = 255 * val;
        }
    }

    inputCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(inputCanvas, 0,0);

  

    if (typeof badnet_mnist !== 'undefined')
    {

        let Y = inferenceBadNet(X, badnet_mnist);
        let probs = exp_normalize(Y);

        let maxVal = 0;
        let maxIx = 0;
        for (let i = 0; i < 10; ++i)
        {
            if (probs[i] > maxVal)
            {
                maxVal = probs[i];
                maxIx = i;
            }
        }
        ctx.font = '14px serif';    
        if (maxVal > 0.6)
        {
            ctx.fillText('Guess: ' + maxIx + ' p: ' + maxVal.toFixed(2), 10, 50);
        } else {
            ctx.fillText('Could not guess the number reliably...', 10, 50);
        }
    }


    ctx.beginPath();
    ctx.moveTo(x0,y0);
    ctx.lineTo(x1,y0);
    ctx.lineTo(x1,y1);
    ctx.lineTo(x0,y1);
    ctx.lineTo(x0,y0);
    ctx.stroke();

    --fpsCount;
    if (fpsCount == 0)
    {
        let deltaT = Date.now() - fpsTimer;
        fpsCount = 10;
        fpsEstimate = fpsCount/(1e-3*deltaT);
        fpsTimer = Date.now();

    }
    ctx.fillText("FPS: " + fpsEstimate.toFixed(1), 32,16);

    window.requestAnimationFrame(updateCamera);

}

async function main()
{    
    await setupCamera();
    video.play();

    videoWidth = video.videoWidth;
    videoHeight = video.videoHeight;


    canvas = document.getElementById('output');
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const canvasContainer = document.querySelector('.canvas-wrapper');
    canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;

    inputWidth = 28;
    inputHeight = 28;
    inputCanvas = document.createElement('canvas');
    inputCanvas.width = inputWidth;
    inputCanvas.height = inputHeight;
    X = new Float32Array(inputWidth*inputHeight);

    fpsCount = 10;
    fpsEstimate = 0;
    
    fetch("mnist.badnet.json").then(response => {
        return response.json();
    }).then(net =>
    {
        badnet_mnist = net;
        console.log("Loaded network");
        fpsTimer = Date.now();
        window.requestAnimationFrame(updateCamera);
    });

}

main();
