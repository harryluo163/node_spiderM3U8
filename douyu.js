/**
 * Created by Harry on 2017/5/11.
 */
var request = require("request");
//文档分析
var cheerio = require("cheerio");
var fs = require('fs');
//日志
var logger = require("./bin/logHelper").helper;
//流程控制
var async = require("async");
//数据库访问
var Sequelize = require('sequelize');
var data_db= new Sequelize(
    "myurl",
    "root",
    "Root!!2018",{
        dialect:'mysql',
        host:'47.105.36.188',
        port:3306
    }
);
var windohref="http://520161.com"


function start() {
// 注：配置里的日志目录要先创建，才能加载配置，不然会出异常
    logger.writeInfo("开始记录日志");
    // spide(windohref+'/v1.html',"国产");
    // spide(windohref+'/v2.html',"日本");
    // spide(windohref+'/v3.html',"欧美");
    // spide(windohref+'/v5.html',"三级");
    // spide(windohref+'/v6.html',"限制");
    spide(windohref+'/v7.html',"合集");
    // spide('http://520161.com/v7.html');
}

function spide(url,info) {
    //流程控制
    async.waterfall([
        function(cb){
            request({
                url: url,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'
                }
              }, function (error, response, body) {
                //获取总页数
                if (!error && response.statusCode == 200) {
                    var $ = cheerio.load(body, {
                        normalizeWhitespace: true,
                        decodeEntities: false
                    });
                    var num =GetStr($(".menu .pagelink_a").last().attr("href"),'-','.html');
                    cb(null,num);
                }

            })
        },
        function(num,cb){
            var opts = [];
            for (var i = 1; i <=num; i++) {
                if(i==1){
                    opts.push({
                        method: 'GET',
                        url: url,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'
                          },
                        qs: {page: i,info:info}
                    });
                }else{
                    opts.push({
                        method: 'GET',
                        url: url.replace(".html","-"+i+".html"),
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'
                          },
                        qs: {page: i,info:info}
                    });
                }
           
            }
            //2秒抓一次
            // async.eachSeries(opts,function (opt, callback) {
            //     setTimeout(function(){
            //         fetchPage(opt, (err) => {callback()});
            //       }, 2000);
            //     }
            // );
            //控制最大并发数为5，
            async.forEachLimit(opts,1,function (opt, callback) {
                    setTimeout(function(){
                        fetchPage(opt, (err) => {callback()});
                    }, 2000);
                },function (err) {
                    if (err) {
                        logger.writeErr(err);
                        cb(err);
                    } else {
                        logger.writeInfo(info+"抓取结束");
                        console.log(info+"抓取结束");
                        cb();
                    }
                }
            );
        }
    ]);



}

function fetchPage(opt, cb) {
    console.log("抓取"+opt.qs.info+"第" + opt.qs.page+"页");
    request(opt, function (error, response, body) {
        if (error) {
            return;
        }
        var $ = cheerio.load(body, {
            normalizeWhitespace: true,
            decodeEntities: false
        });
        var items = [];
        logger.writeInfo("抓取"+opt.qs.info+"第" + opt.qs.page+"页");
        var reg=new RegExp("&nbsp;","g")
        $(".pvod li").each(function (index, el) {
            var item = {
                page: opt.qs.page,
                info: opt.qs.info,
                lable:$(el).find('a').find(".title").text().replace(reg,""),
                title:$(el).find('a').attr("title"),
                url:windohref+$(el).find('a').attr("href")
            };
            items.push(item);
        });

        //控制最大并发数为5，
        async.forEachLimit(items,1,function (item1, callback1) {
            setTimeout(function(){
                fetchPageInfo(item1, (err) => {callback1()});
            }, 2000);
        },function (err) {
            if (err) {
                logger.writeErr(err);
                cb(err);
            } else {
                logger.writeInfo(opt.qs.info+"抓取结束");
                console.log(opt.qs.info+"抓取结束");
                cb();
            }
        }
        );

    });
}

function fetchPageInfo(item, cb) {
    
    console.log("抓取"+item.title+"视频链接");
    request({
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'
          },
          url:item.url 
    }, function (error, response, body) {
        if (error) {
            return;
        }
        var $ = cheerio.load(body, {
            normalizeWhitespace: true,
            decodeEntities: false
        });

        if(item.info=="合集"){
            console.log("抓取"+item.title+"视频合集链接");
            item.jieshao=$(".jieshao").text();
            var items2=[]
            var title=item.title;

            $(".xuanji").find("a").each(function (index, el) {
                items2.push({
                    page: item.page,
                    info:item.info,
                    lable:item.lable,
                    title:item.title+"__"+$(el).text(),
                    url:windohref+$(el).attr("href")
                });
            })
            //控制最大并发数为5，
            async.forEachLimit(items2,5,function (item2, callback2) {
                setTimeout(function(){
                    fetchPageInfo2(item2, (err) => {callback2()});
                }, 2000);
            },function (err) {
                if (err) {
                    logger.writeErr(err);
                    cb(err);
                } else {
                    cb();
                }
            }
            );

        

        }else{

            item.video=$("video").attr("src");
        
            var sql="INSERT INTO video(a,b,c,d,e,f) VALUES ('"+item.page+"','"+cleanstr(item.info)+"','"+cleanstr(item.lable)+"','"+cleanstr(item.title)+"','"+cleanstr(item.url)+"','"+cleanstr(item.video)+"')" ;
                //插入mssql
                data_db.query(sql).then(function (q) {
                    cb();
                });
                    // //json格式
            // fs.writeFile('output/output'+item.page+'.json', JSON.stringify(item, null, 2), function (err) {
            //     console.log("插入第" + item.page+"页");
            //     cb();
            // });
        }
    

        

    });
}

function fetchPageInfo2(item, cb) {
    
    console.log("抓取"+item.title+"视频链接");
    request({
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'
          },
          url:item.url 
    }, function (error, response, body) {
        if (error) {
            return;
        }
        var $ = cheerio.load(body, {
            normalizeWhitespace: true,
            decodeEntities: false
        });
        item.video=$("video").attr("src");
        var sql="INSERT INTO video(a,b,c,d,e,f) VALUES ('"+item.page+"','"+cleanstr(item.info)+"','"+cleanstr(item.lable)+"','"+cleanstr(item.title)+"','"+cleanstr(item.url)+"','"+cleanstr(item.video)+"')" ;
            //插入mssql
            data_db.query(sql).then(function (q) {
                cb();
            });
                // //json格式
        // fs.writeFile('output/output'+item.page+'.json', JSON.stringify(item, null, 2), function (err) {
        //     console.log("插入第" + item.page+"页");
        //     cb();
        // }); 

    });
}

function GetStr(pContent,regBegKey, regEndKey ){

    var regstr = "";
    var regular = "(?<="+regBegKey+")(.|\n)*?(?="+regEndKey+")";
    regstr= pContent.match(regular)
    return regstr[0].trim();

}
function cleanstr(str){
    var reg1=new RegExp("'","g")
    var reg2=new RegExp("&nbsp;","g")
    return str.replace(reg1,"").replace(reg2,"")
}
exports.start =start;