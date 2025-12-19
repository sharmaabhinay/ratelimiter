let express = require('express');
let mongoose = require('mongoose');

let app = express();
const WINDOW_SIZE  = 60*1000;
let port = 3000;

//mongo db connectoin
mongoose.connect('mongodb://localhost:27017/tempdb');

//schema
const rateLimitSchema = new mongoose.Schema({
    key: {type:String, unique:true},
    count:{type:Number, default: 1},
    windowStart:{type:Date, required:true}
});

const rateLimit = mongoose.model('rateLimit', rateLimitSchema);

//check rate limit
async function checkLimit(key, maxlimit){
    const now = new Date();
    const record = await rateLimit.findOne({key});
     if(!record){
        await rateLimit.create({key, count:1, windowStart: now});
        return true;
     };
    if(now - record.windowStart > WINDOW_SIZE){
        record.count = 1;
        record.windowStart = now;
        await record.save();
        return true;

    }

    if(record.count >= maxlimit) return false;

    record.count += 1;
    await record.save();
    return true;

} 

//middleware
async function rateLimiter(req,res,next){
    const userId = req.headers.userId;
    if(!userId){
        return;

        res.status(400).json
        ({message:"userId header required"})
    }

    const ip = req.headers['x-forwarded-for']?.split(",")[0] || req.ip;

    const userAllowed = await checkLimit(`user:${userId}`, 5);
    if(!userAllowed){
        return res.status(429).json({message:"user rate limit exceeded"});

    }
    next();
}

//api endpoint
app.get("/data", rateLimiter, (req,res) => {
    res.json({
        data:"protected data",
        message:"successful"
    })

})



app.listen(port, ()=> {
    console.log('server is running on port ' + port);
})
