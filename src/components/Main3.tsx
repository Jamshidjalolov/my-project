import React from 'react'
import img1 from "../images/Untitledd-1 1.png"
import img2 from "../images/muzqaymoq.png"


function Main3() {
  return (
    <div className='main3'>
        <div className="box1">
            <div className="img"></div>
            <h1>Fresh Vegetable</h1>
            <button>Order Now</button>
            
        </div>
       
        <div className="box2">
          
            <div  className="cardcha">
               
                <div className="box">
                    <div className="img"></div>
                    <h1>bakery bread viennoiserie...</h1>
                    <p><b>$40.00 </b> $30.00 (1kg)</p>
                </div>
                <div className="box">
                    <div className="img">
                        <img src={img2} alt="" />
                    </div>
                    <h1>ICE cream cones sundae...</h1>
                    <p><b>$20.00 </b> $15.00 (1kg)</p>
                </div>
                <div className="box">
                    <div className="img">
                        <img src={img1} alt="" />
                    </div>
                    <h1>Papaya seed auglis fruit...</h1>
                    <p><b>$45.00 </b> $35.00 (1kg)</p>
                </div>
            </div>
        </div>
    </div>
  )
}

export default Main3
