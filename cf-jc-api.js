
    // Cloudflare的IP范围
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

    // 检查IP是否在指定范围内
    function isIPInRange(ip, range) {
    var ipParts = ip.split(".");
    var rangeParts = range.split("/");
    var baseIP = rangeParts[0];
    var subnet = parseInt(rangeParts[1], 10);
    var baseIPParts = baseIP.split(".");

    // 将 IP 地址和基准 IP 地址转换为整数
    var ipInt = (parseInt(ipParts[0], 10) << 24) |
                (parseInt(ipParts[1], 10) << 16) |
                (parseInt(ipParts[2], 10) << 8) |
                parseInt(ipParts[3], 10);
    var baseIPInt = (parseInt(baseIPParts[0], 10) << 24) |
                    (parseInt(baseIPParts[1], 10) << 16) |
                    (parseInt(baseIPParts[2], 10) << 8) |
                    parseInt(baseIPParts[3], 10);

    // 计算子网掩码
    var mask = -1 << (32 - subnet);

    // 检查 IP 地址是否在指定范围内
    return (ipInt & mask) === (baseIPInt & mask);
    }

    // 发送 HTTP 请求，并检查回复内容是否包含 "Performance & security by Cloudflare"
    function checkForCloudflareProtection(url) {
        var httpRequest = new XMLHttpRequest();
            httpRequest.open("HEAD", "https://" + url, true);
            httpRequest.onreadystatechange = function() {
                if (httpRequest.readyState === 4) {
                    if (httpRequest.status === 403) {
                        console.log(url + " 的回复内容表明其属于 Cloudflare");
                } else {
                    console.log(url + " 的回复内容不表明其属于 Cloudflare");
                }
                }
            };
            httpRequest.send();
    }

    // 计算建立会话的时间
    function calculateSessionEstablishmentTime() {
        return new Promise(function(resolve) {
            var navigationStart = performance.timing.navigationStart;
            var domInteractive = performance.timing.domInteractive;
            var sessionEstablishmentTime = domInteractive - navigationStart;
            resolve(sessionEstablishmentTime);
        });
    }

    // 检查并重定向到速度最快的备选域名
    async function redirectFastestDomain(urls) {
        var fastestUrl = "";
        var fastestTime = Infinity;

        // for (var i = 0; i < urls.length; i++) {
        //     var sessionTime = await calculateSessionEstablishmentTime();
        //     alert("域名 " + urls[i] + " 的会话建立时间为：" + sessionTime + " 毫秒");
        //     if (sessionTime < fastestTime) {
        //         fastestTime = sessionTime;
        //         fastestUrl = urls[i];
        //     }
        // }

        if (fastestUrl !== "") {
            if (confirm("速度最快的备选域名为 " + fastestUrl + "，是否重定向？")) {
                window.location.href = "https://" + fastestUrl;
            }
        } else {
            console.error("没有找到可用的备选域名");
        }
    }

    // 检查域名的解析IP是否属于Cloudflare
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
                        console.log(url + " 的域名解析IP: " + resolvedIP);
                        var isCloudflare = false;
                        for (var j = 0; j < cloudflareIPs.length; j++) {
                            if (isIPInRange(resolvedIP, cloudflareIPs[j])) {
                                isCloudflare = true;
                                break;
                            }
                        }
                        if (isCloudflare) {
                            console.log(url + " 的域名解析IP属于 Cloudflare");
                            // 如果解析IP属于 Cloudflare，执行相应的操作
                            redirectFastestDomain(urls);
                        } else {
                            console.log(url + " 的域名解析IP不属于 Cloudflare，尝试检测...");
                            checkForCloudflareProtection(resolvedIP);
                        }
                    } else {
                        console.error("未找到 " + url + " 的域名解析结果");
                    }
                    completedRequests++;
                    if (completedRequests === urls.length) {
                        console.log("所有备选地址解析完毕");
                    }
                }
            };
            dnsResolver.send();
        }

        for (var i = 0; i < urls.length; i++) {
            checkUrl(urls[i]);
        }
    }

    // 在页面加载完成后调用函数
    window.onload = function() {
        var urls = [
            "blog.hgtrojan.com", // 第一个备选地址
            "blog.hgtrojan.com", // 第二个备选地址
        ];
        checkCloudflareForUrls(urls);
    };
