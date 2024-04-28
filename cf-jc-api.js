// 存储 Cloudflare 的 IP 范围
var cloudflareIPs = [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
    "172.64.128.0/18",
    "172.64.192.0/19",
    "172.64.224.0/22",
    "172.64.229.0/24",
    "172.64.230.0/23",
    "172.64.232.0/21",
    "172.64.240.0/21",
    "172.64.248.0/21",
    "172.65.0.0/16",
    "172.66.0.0/16",
    "172.67.0.0/16"
];

// 存储通过 Cloudflare 检查的域名
var cloudflarePassedDomains = [];

// 标志是否所有域名都已经检测完毕
var allUrlsChecked = false;

// 检查IP是否在指定范围内
function isIPInRange(ip, range) {
    var ipParts = ip.split(".");
    var rangeParts = range.split("/");
    var baseIP = rangeParts[0];
    var subnet = parseInt(rangeParts[1], 10);
    var baseIPParts = baseIP.split(".");
    var ipInt = (parseInt(ipParts[0], 10) << 24) |
                (parseInt(ipParts[1], 10) << 16) |
                (parseInt(ipParts[2], 10) << 8) |
                parseInt(ipParts[3], 10);
    var baseIPInt = (parseInt(baseIPParts[0], 10) << 24) |
                    (parseInt(baseIPParts[1], 10) << 16) |
                    (parseInt(baseIPParts[2], 10) << 8) |
                    parseInt(baseIPParts[3], 10);
    var mask = -1 << (32 - subnet);
    return (ipInt & mask) === (baseIPInt & mask);
}

// 检查域名的解析IP是否属于 Cloudflare
function checkCloudflareForUrls(urls) {
    var completedRequests = 0;

    function checkUrl(url) {
        var dnsResolver = new XMLHttpRequest();
        dnsResolver.open("GET", "https://dns.alidns.com/resolve?name=" + url + "&type=A");
        dnsResolver.onreadystatechange = function() {
            if (dnsResolver.readyState === 4 && dnsResolver.status === 200) {
                var response = JSON.parse(dnsResolver.responseText);
                if (response.Answer) {
                    var resolvedIP = response.Answer[0].data;
                    var isCloudflare = false;
                    for (var j = 0; j < cloudflareIPs.length; j++) {
                        if (isIPInRange(resolvedIP, cloudflareIPs[j])) {
                            isCloudflare = true;
                            break;
                        }
                    }
                    if (isCloudflare) {
                        cloudflarePassedDomains.push(url);
                    }
                }
                completedRequests++;
                if (completedRequests === urls.length) {
                    allUrlsChecked = true;
                    redirectFastestDomain();
                }
            }
        };
        dnsResolver.send();
    }

    for (var i = 0; i < urls.length; i++) {
        checkUrl(urls[i]);
    }
}

// 检查并重定向到速度最快的备选域名
async function redirectFastestDomain() {
    while (!allUrlsChecked) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    var fastestUrl = "";
    var fastestTime = Infinity;
    var navigationStart = performance.timing.navigationStart;
    var domInteractive = performance.timing.domInteractive;
    var sessionEstablishmentTime = domInteractive - navigationStart;

    // 存储会话建立时间信息的数组
    var sessionTimes = [];

    for (var i = 0; i < cloudflarePassedDomains.length; i++) {
        sessionTimes.push(cloudflarePassedDomains[i] + ": " + sessionEstablishmentTime + " 毫秒");
        if (sessionEstablishmentTime < fastestTime) {
            fastestTime = sessionEstablishmentTime;
            fastestUrl = cloudflarePassedDomains[i];
        }
    }

    if (fastestUrl !== "") {
        var message = "备选域名的会话建立时间：\n" + sessionTimes.join("\n") + "\n\n速度最快的备选域名为 " + fastestUrl + "，是否重定向？";
        if (confirm(message)) {
            window.location.href = "https://" + fastestUrl;
        }
    } else {
        console.error("没有找到可用的备选域名");
    }
}


// 页面加载后检查域名是否属于 Cloudflare
window.onload = function() {
    var urls = [
        "blog.hgtrojan.com", // 第一个备选地址
        "blog.hgtrojan.com", // 第二个备选地址
    ];
    checkCloudflareForUrls(urls);
};
