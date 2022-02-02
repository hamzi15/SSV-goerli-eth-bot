require('dotenv').config({path: '../.env'})
const { Pool } = require('pg');
const { max } = require('pg/lib/defaults');

let pool = new Pool({
    user: process.env.DB_USERNAME,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
})
pool.connect();

pool.query('SELECT NOW()', (err, res) => {
    if(err){
        console.log('Database connection failed',err);
    }
    else {
        console.log('Database connected!');
    }
});


const createTable = `create table if not exists depositortest(
    discordid         bigint not null constraint depositortest_pk primary key,
    address           varchar,
    dailycount        real,
    weeklycount       real,
    dailytime         timestamp,
    weeklytime        timestamp
)`

const createLogTable = `create table if not exists txlogs(
    discord_id bigint,
    discord_name varchar,
    pub_key    varchar,
    etherscan_link varchar,
    deposit_abi varchar,
    created_at timestamp
)
`

pool.query(createTable, (err, res) => {
    if(err){
        console.log('depositor table creation failed',err);
    }
    else {
        console.log('depositor table created!');
    }
});

pool.query(createLogTable, (err, res) =>{
    if(err){
        console.log('Log table initialization failed.')
    }
    else  {
        console.log('Log table initialized!')
    }
})

const dailyLimit = parseFloat(process.env.DAILY_LIMIT) - 1;
const weeklyLimit = parseFloat(process.env.WEEKLY_LIMIT) - 1;
const maxTries = 3;

module.exports = {
    confirmTransaction: async function(discordID, address, topUpAmount){
        //add try catch
        var count = 0
        while (true){
            try{
                var userDetails = (await checkUserExists(discordID));
                //console.log("Check account exists address details:",userDetails);
                //Assumes userDetails will always be an array

                if (!userDetails.length){
                    const userDetails = await setDepositor(discordID, address);
                    await this.updateCounts(userDetails.discordid, topUpAmount);
                    return true
                }
                userDetails = userDetails[0];
                if (userDetails.address !== address){
                    await updateAddress(discordID, address)
                    userDetails.address = address
                }
                //refresh daily limit and weekly limit
                //check daily limit and weekly limit
                //If either are reached reject transaction
                if (!(await checkDailyLimit(userDetails))){
                    return 401;
                }
                if (!(await checkWeeklyLimit(userDetails))){
                    return 402;
                }
                //refresh norequests
                await this.updateCounts(discordID,topUpAmount)
                return true
            } catch (e) {
                console.log("Confirm transaction function failed.")
                if (++count == maxTries) return null;
            }
        }
    },
    updateCounts: async function(discordID, topUpAmount){
        var userDetails = (await checkUserExists(discordID));
        userDetails = userDetails[0];
        var newDailyCount = userDetails.dailycount;
        var newWeeklyCount = userDetails.weeklycount;

        if (topUpAmount > 0 ){
            newDailyCount = Number(userDetails.dailycount + topUpAmount);
            newWeeklyCount = Number(userDetails.weeklycount + topUpAmount);
        } else {
            if (userDetails.dailycount > 0) newDailyCount = Number(userDetails.dailycount + topUpAmount);
            if (userDetails.weeklycount > 0) newWeeklyCount = Number(userDetails.weeklycount + topUpAmount);
        }
        
        const update = 'update depositortest set dailycount= $1,weeklycount= $2 where discordid= $3';
        const values = [newDailyCount,newWeeklyCount, BigInt(discordID)];
        await pool.query(update,values);
    },
    addLog: async function(discord_id, discord_name,pubKey, etherscan_link, deposit_abi){
        var count = 0;
        while (true) {
            try {
                const now = new Date();
                const insert =   `INSERT INTO txlogs
                                (discord_id,discord_name,pub_key,etherscan_link,deposit_abi,created_at) VALUES ($1,$2,$3,$4,$5,$6);`
                const values = [discord_id,discord_name,pubKey,etherscan_link,deposit_abi,now];
                await pool.query(insert,values);
                return true
            } catch (e) {
                if (++count == maxTries) return false;
            }
        }
    }
}

async function updateAddress(discordID, address){
    const query = `update depositortest set address=$1 where discordid=$2`
    const vals = [String(address), BigInt(discordID)]
    await pool.query(query, vals);
}

async function checkUserExists(discordID){
    const select = `
        SELECT * FROM depositortest
        WHERE discordid = $1
    `;
    const value = [BigInt(discordID)]
    const result = await pool.query(select, value);
    return result.rows;
}

async function setDepositor(discordID, address){
    const now = new Date();
    const insert = `
        INSERT INTO depositortest
            (discordid,address,dailyCount,weeklyCount,dailyTime,weeklyTime) 
            VALUES ($1,$2,$3,$4,$5,$6);
        `
    const insertVals = [BigInt(discordID),address,0,0,now,now];
    await pool.query(insert, insertVals);
    return {
        discordid: BigInt(discordID),
        address: address,
        dailycount: 0,
        weeklycount: 0,
        dailytime: now,
        weeklytime: now,
    };
}

async function checkDailyLimit(userDetails){
    const dailycount = await resetDailyCount(userDetails);
    console.log("Latest dailycount:",dailycount);
    return dailycount <= dailyLimit;
}

async function resetDailyCount(userDetails){
    const now = new Date();
    // console.log(userDetails);
    const discordID = BigInt(userDetails.discordid);
    const dailytime = userDetails.dailytime;
    if ((Math.floor(now.getTime()/1000 - Math.floor(dailytime.getTime()/1000))) > 86400){
        //update
        console.log('Resetting Daily...');
        const update = 'update depositortest set dailycount=0,dailytime=$1 where discordid= $2 returning dailycount'
        const values = [now, discordID]
        const dailycount = await pool.query(update,values);
        return dailycount.rows[0].dailycount; //daily limit has been reset
    }
    return userDetails.dailycount;
}

async function checkWeeklyLimit(userDetails){
    const weeklycount = await resetWeeklyCount(userDetails);
    return weeklycount <= weeklyLimit;
}

async function resetWeeklyCount(userDetails){
    const now = new Date();
    const discordID = BigInt(userDetails.discordid);
    const weeklytime = userDetails.weeklytime;

    if ((Math.floor(now.getTime()/1000 - Math.floor(weeklytime.getTime()/1000))) > 604800){
        //update
        console.log('Resetting Weekly...');
        const update = 'update depositortest set weeklycount=0,weeklytime=$1 where discordid= $2 returning weeklycount'
        const values = [now,discordID]
        const weeklycount = await pool.query(update,values);
        return weeklycount.rows[0].weeklycount; //weekly limit has been reset
    }
    return userDetails.weeklycount;
}
