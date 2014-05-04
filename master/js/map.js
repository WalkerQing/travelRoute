TravelRoute.Map = {
    map: {},
    point: {},
    util: {},
    marker: {},
    objArr: [],
    start: "",      // 起点
    end: "",        // 终点
    results: [],    // 保存结果
    resultsLen: 0,  // 结果长度

    initialize: function(){
        var self = this;
        // util
        self.util = TravelRoute.Util;
        //首先呈现的界面
       self.originPresentation();
        // localCity居中显示
       self.centerByLocalCity();
        // 修改配置
       self.modDefaults();
        // 运行中dom的操作
        self.runChange();
    },

    // 加载地图首先展示的页面
    originPresentation: function(){
        this.map = new BMap.Map("t_map_container");
        this.point = new BMap.Point(116.404, 39.915);
        this.map.centerAndZoom(this.point,12);
        // 将map设为全局变量
        TravelRoute.Config.Map = this.map;
    },
    // 设置起点
    setStart: function(start){
        this.start = start;
    },
    // 设置终点
    setEnd: function(end){
        this.end = end;
    },
    // 获取起点
    getStart: function(){
        return this.start;
    },
    // 获取终点
    getEnd: function(){
        return this.end;
    },

    // 根据localCity，并将该城市为中心点显示在地图上
    centerByLocalCity: function(){
        var self = this;
        var myFun = function(result){
            self.map.setCenter(result.name);  // result.name为城市名字，并将地图以该城市为中心点显示
        }
        // 根据IP获取城市名字
        var myCity = new BMap.LocalCity();
        myCity.get(myFun);
    },

    // 修改默认配置
    modDefaults: function(){
        this.addControl();
        this.modProperty();
    },

    // 添加控件
    addControl: function(){
        this.map.addControl(new BMap.NavigationControl());
        this.map.addControl(new BMap.ScaleControl());
        this.map.addControl(new BMap.OverviewMapControl());
        this.map.addControl(new BMap.MapTypeControl());
    },

    // 修改默认属性
    modProperty: function(){
        this.map.enableScrollWheelZoom();    //启用滚轮放大缩小，默认禁用
        this.map.enableContinuousZoom();    //启用地图惯性拖拽，默认禁用
    },

    getElementById: function(div){
        return document.getElementById(div);
    },

    // 搜索提示
    doSearchSuggest: function(){
        var self = this;
        var resultValue;

        // 在地图上标注搜索结果
        var markSearchResults = function(){
//            self.map.clearOverlays();    //清除地图上所有覆盖物
            var local = new BMap.LocalSearch("全国", { //智能搜索
                renderOptions: {
                    map: self.map,
//                    panel : "t_suggest_results",
                    autoViewport: true,
                    selectFirstResult: false
                },
                onSearchComplete: function(){
                    var pp = local.getResults().getPoi(0).point;    //获取第一个智能搜索的结果
                    self.map.centerAndZoom(pp, 18);
                    self.map.addOverlay(new BMap.Marker(pp));    //添加标注
                }
            });
            local.search(resultValue);
        };
        // 百度地图创建自动填充对象
        var ac = new BMap.Autocomplete(    //建立一个自动完成的对象
            {
                "input": "t_search_input",
                "location": "全国"
            }
        );
        // 鼠标放在提示下拉列表的事件
        ac.addEventListener("onhighlight", function(e) {  //鼠标放在下拉列表上的事件
            var _value = e.fromitem.value;
            var value = "";
            if (e.fromitem.index > -1) {
                value = _value.province +  _value.city +  _value.district +  _value.street +  _value.business;
            }
            value = "";
            if (e.toitem.index > -1) {
                _value = e.toitem.value;
                value = _value.province +  _value.city +  _value.district +  _value.street +  _value.business;
            }

        });
        // 鼠标点击下拉列表后的事件
        ac.addEventListener("onconfirm", function(e) {
            var _value = e.item.value;
            resultValue = _value.province +  _value.city +  _value.district +  _value.street +  _value.business;
            markSearchResults();
            //self.getPointPlace(resultValue);
        });
    },

    // 根据地点进行标注
    getPointPlace: function(place){
        var self = this;
        var myGeo = new BMap.Geocoder();
        myGeo.getPoint(place, function(point){
            console.log(point);
            var marker = new BMap.Marker(point);        // 创建标注
            self.map.addOverlay(marker);                // 将标注添加到地图中
        },"全国");

    },

    // 根据不同策略选择的驾车方式
    selStrategyDrive: function(arrPlace, opt){
        var self = this;
        // 多地点的起点和终点
        self.start = self.start || arrPlace[0];
        self.end = self.end || arrPlace[arrPlace.length-1];

        var routePolicy = [BMAP_DRIVING_POLICY_LEAST_TIME,BMAP_DRIVING_POLICY_LEAST_DISTANCE,BMAP_DRIVING_POLICY_AVOID_HIGHWAYS];
        arrPlace = self.util.trimArray(arrPlace);
        self.map.clearOverlays();
        var arrayEdge = new Array();
        var arrLen = arrPlace.length;

        var beginSearch = function(start, end){

            function search(start,end,route){
                var transit = new BMap.DrivingRoute(self.map,
                    {
                        onSearchComplete: function(results){
                            if (transit.getStatus() == BMAP_STATUS_SUCCESS){
                                var plan = results.getPlan(0);

                                var distance = plan.getDistance(false);
                                var time = plan.getDuration(false);

                                var value = (value!=0 ? distance : time);
                                arrayEdge.push(new Edge(start, end, value));
                                $('#t_search_results').children('ul').html("");
                                $('#t_progress_info').show();
                                $('#t_progress_info').html("时间距离搜索中...");


                                if(arrayEdge.length == (arrLen*(arrLen-1)/2)){
                                    console.log(arrayEdge);
                                    $('#t_progress_info').html("路径寻找中...");
                                    self.searchWaitInfo(1);
                                    TravelRoute.Calc.init(self.start,self.end,arrayEdge);
                                    var routeResults = TravelRoute.Calc.showCalResults();
                                    self.resultsLen = routeResults.length;
                                    console.log("oYe");
                                    self.resultsRouteAdd(routeResults, route);
                                }
                            }else{
                                self.searchWaitInfo(2);
                                return false;
                            }

                        },
                        policy: route
                    }

                );
                transit.search(start,end);
            }
            //三种驾车策略：最少时间，最短距离，避开高速
            search(start,end,routePolicy[opt]); //最少时间
        };

        // 计算两两节点之间的距离和时间
        for(var i=0; i<arrPlace.length; i++){
            for(var j=i+1; j<arrPlace.length; j++){
                beginSearch(arrPlace[i], arrPlace[j]);
            }
        }
    },

    searchWaitInfo: function(type){
        var self = this;
        var obj = {};
        switch(type){
            case 0:
                obj.info = "时间距离搜索中...";
                break;
            case 1:
                obj.info = "路径寻找中...";
                break;
            case 2:
                obj.info = "有无效的目的地,请重新输入...";
                break;

        }
        var $ulNode = $('#t_search_results').children('.t_search_results_panel').children('ul');
        var $liNode = $ulNode.children('.t_search_results_info');
        if($liNode.length>0){
            $liNode.html(obj.info);
        }else{
            var $tpl = self.util.getTemplate("view", "resultsInfo", obj);
            $ulNode.html("");
            $ulNode.append($tpl);
        }

    },

    resultsRouteAdd: function(routeResults, policy){
        var self = this;
        self.map.clearOverlays();
        $('#t_progress_info').html("路径搜索完毕...");
        $('#t_progress_info').fadeOut();
        var len = routeResults.length;
        for(var i=0; i<len; i++){
            self.showResults(routeResults[i], i);
            if(i<len-1){
                // 地图上添加路径
                self.addDrivingRoute(routeResults[i], routeResults[i+1], policy, i);
            }
        }
    },

    showResults: function(place, index){
        var obj = {};
        if(index == 0){
            obj.place = "<span class='t_results_item_start'>起点</span>" + ": " + place;
        }else if(index == this.resultsLen-1){
            obj.place = "<span class='t_results_item_end'>终点</span>" + ": " + place;
        }else{
            obj.place = "<span class='t_results_item_through'>途径</span>" + ": " + place;
        }
        obj.item = index;
        obj.content = "";
        var $tpl = this.util.getTemplate("view", "resultItem", obj);
        var $ulNode = $("#t_search_results").children('.t_search_results_panel').children('ul');
        if($ulNode.children('.t_search_results_info').length>0){
            $ulNode.html("");
        }
        $ulNode.append($tpl);
    },

    addDrivingRoute: function(start, end, policyVal, index){
        var self = this;
        console.log(start+"->"+end);
        var transit = new BMap.DrivingRoute(self.map,
            {
                onSearchComplete: function(results){
                    if (transit.getStatus() == BMAP_STATUS_SUCCESS){
                        console.log(start + "=====" + end);
                        // 添加覆盖层
                       self.addOverlays(start, end, results);
                        // 添加文字
                       self.addText(start, end, results, index);
                    }

                },
                policy: policyVal
            }

        );
        transit.search(start,end);
    },

    addOverlays: function(oriStart, oriEnd, results){
        // 自行添加起点和终点
        var start = results.getStart();
        var end = results.getEnd();

        var startType = this.diffPlaceType(oriStart);
        var endType = this.diffPlaceType(oriEnd);
        console.log("start:"+startType+"-"+oriStart+",end:"+endType+"-"+oriEnd);
        this.addPlaceMark(start.point, start.title, startType);
        this.addPlaceMark(end.point, end.title, endType);

        var viewPoints = [start.point, end.point];
        var plan = results.getPlan(0);

        for (var i =0; i < plan.getNumRoutes(); i ++) {
            this.addRoute(plan.getRoute(i).getPath());
            viewPoints.concat(plan.getRoute(i).getPath());
        }
        this.map.setViewport(viewPoints, {
            margins: [40, 10, 10, 10]
        });
    },

    addText: function(start, end, results, index){
        console.info(index);
        var plan = results.getPlan(0);
        var distance = plan.getDistance();
        var time = plan.getDuration();
        var timeDistance = "（约" + distance + "/" + time + ")";

        var htmls = [];
        for (var i =0; i < plan.getNumRoutes(); i ++) {
            var route = plan.getRoute(i);
            for (var j =0; j < route.getNumSteps(); j ++) {
                var curStep = route.getStep(j);
                htmls.push((j +1) +'. '+ curStep.getDescription() +'<br />');
            }
        }
        var routeDes = $('#t_search_results').find('.t_route_description[item='+index+']');
        routeDes.html(htmls.join(''));

        routeDes.css({'line-height': '1.4em','font-size': '12px'});
        var $resultsItem = $('#t_search_results').find('.t_results_item[item='+index+']');
        $resultsItem.children('.t_results_item_timeDistance').html(timeDistance);
    },

    diffPlaceType: function(place){
        var opt = 1;
        if(place == this.start){
            opt = 0;
        }else if(place == this.end){
            opt = 2;
        }
        return opt;
    },

    addPlaceMark: function(point, title, opt){
        var baseImg = 'assets/images/';
        var suffix = '.png';
        var markImg = ['icon_nav_start','icon_navi_poi_toilet','icon_navi_poi_parking'];
        var iconUrl = baseImg + markImg[opt] + suffix;

        var marker = new BMap.Marker(point, {
            title: title,
            icon: new BMap.Icon(iconUrl, new BMap.Size(31, 46), {
                anchor: new BMap.Size(4, 36)
            })})

        this.map.addOverlay(marker);

        // 在标注点上添加右键菜单
        var menu = new BMap.ContextMenu();
        var txtMenuItem = [
            {
                text:'设为起点',
                callback:function(){}
            },
            {
                text:'设为终点',
                callback:function(){map.zoomOut()}
            }
        ];


        for(var i=0; i < txtMenuItem.length; i++){
            menu.addItem(new BMap.MenuItem(txtMenuItem[i].text,txtMenuItem[i].callback,100));
        }

        marker.addContextMenu(menu);

    },

    addRoute: function(path){
        this.map.addOverlay(new BMap.Polyline(path, {
            strokeColor: '#333',
            enableClicking: false
        }));
    },

    // 获取输入框的内容
    getInputContent: function(){
        // 获取输入框的内容
        var searchText = $('.searchText');
        var len = searchText.length;
        var i = 0;
        var arrContent = [];
        for( ; i<len; i++){
            arrContent.push($(searchText[i]).val());
        }
        console.log(arrContent);
        return arrContent;
    },

    // 添加右键菜单
    addContextMenu: function(){
        var self = this;
        var contextMenu = new BMap.ContextMenu();
        var txtMenuItem = [
            {
                text:'放大',
                callback:function(){self.map.zoomIn()}
            },
            {
                text:'缩小',
                callback:function(){self.map.zoomOut()}
            },
            {
                text:'放置到最大级',
                callback:function(){self.map.setZoom(18)}
            },
            {
                text:'查看全国',
                callback:function(){self.map.setZoom(4)}
            },
            {
                text:'在此添加标注',
                callback:function(p){
                    var marker = new BMap.Marker(p),
                        px = self.map.pointToPixel(p);
                    self.map.addOverlay(marker);
                }
            },
            {
                text:'在此附近找',
                callback:function(p){
                    var $tplContent = self.util.getTemplate("view", "searchNearBy");
                    var marker = new BMap.Marker(p);
                    var infoWindow = new BMap.InfoWindow($tplContent);  // 创建信息窗口对象
                    self.map.addOverlay(marker);
                    marker.addEventListener("click", function(){
                        this.openInfoWindow(infoWindow);
                        $('.t_window_search_btn').click(function(){
                           var searchVal = $(this).prev().val();
                           self.searchInBounds(searchVal);
                        });
                        $('.t_window_main_item ul li').click(function(){
                             var $searchItem = $(this).parents('.t_window_main_item').next();
                             $searchItem.children('.t_window_nearby_input').val($(this).text());
                             $searchItem.children('.t_window_search_btn').trigger('click');
                        });
                    });
                }
            },
            {
                text:'清除标记',
                callback:function(){
                    self.map.clearOverlays();
                }
            }
        ];


        for(var i=0; i < txtMenuItem.length; i++){
            contextMenu.addItem(new BMap.MenuItem(txtMenuItem[i].text,txtMenuItem[i].callback,100));
            if(i==1 || i==3) {
                contextMenu.addSeparator();
            }
        }
        self.map.addContextMenu(contextMenu);
    },

    // 可是区域搜索
    searchInBounds: function(keywords){
        var self = this;
        var local = new BMap.LocalSearch(self.map, {
            renderOptions:{map: self.map}
        });
        local.searchInBounds(keywords, self.map.getBounds());

        self.map.addEventListener("dragend",function(){
            //self.map.clearOverlays();
            local.searchInBounds(keywords, self.map.getBounds());
        });
    },

    // 运行时对DOM的修改
    runChange: function(){
        var self = this;

        // 搜索提示
        self.doSearchSuggest();

        // 添加右键菜单
        self.addContextMenu();

        var curStrategy = 0;

        var $searchResults = $('#t_search_results');

        // 策略选择项
        $searchResults.children('.t_search_results_opt').on("click", "li", function(){
            var $this = $(this);
            $this.addClass('t_search_results_opt_focus');
            $this.siblings().removeClass('t_search_results_opt_focus');
            curStrategy = $this.attr('opt');
            $('#t_btnSearch').trigger('click');

        });

        // 进行DOM操作
        $('#t_place_add_btn').click(function(){
            var obj = {};
            var place = $('#t_search_input').val();
            if(place != ""){
                obj.place = place;
                var $tpl = self.util.getTemplate("view", "placeItem", obj);
                $("#t_place_area").append($tpl);
                $('#t_search_input').val("");
            }
            return false;
        });
        //按回车键的时候，触发点击添加按钮的操作
        $('#t_search_input').keyup(function(e){
            if(e.keyCode == 13){
                $('#t_place_add_btn').trigger('click');
            }
        });
        // 取消地点
        $('#t_place_area').on('click','.t_place_item_cancel',function(){
            $(this).parents('.t_place_item').remove();
        });
        // 多个地点查询
        $('#t_btnSearch').click(function(){
            var liLen = $('#t_place_area').children('li').length;
            if(liLen<2){
                alert("请添加多个地点。。。");
                return false;
            }else{
                var $ulPlaces = $('#t_place_area');
                var $liItem = $ulPlaces.children('.t_place_item');
                var arrPlaces = [];
                for(var i=0; i<liLen; i++){
                    var place = $($liItem[i]).find('.t_place_item_content').text();
                    arrPlaces.push(place);
                }
                var $resultsOpt = $("#t_search_results").children('.t_search_results_opt');
                if($resultsOpt.children('ul').length == 0){
                    var $tpl = self.util.getTemplate("view", "strategyOpt");
                    $resultsOpt.append($tpl);
                }
                $('#t_search_results').children('.t_search_results_panel').children('ul').html("");
                self.searchWaitInfo(0);
                self.selStrategyDrive(arrPlaces, curStrategy);
            }
        });

        // Toggle Class
        $('#t_search_results').on('click', '.t_results_item',function(){
            var item = $(this).attr('item');
            $(this).siblings('.t_route_description[item='+item+']').toggle();
            $(this).children('div').toggleClass('t_results_item_icon_down');
        });


        // 设定起点、终点的显示与隐藏
        $('#t_place_area').on('mouseover mouseout', '.t_place_item', function(){
            var eventType = event.type;
            if(eventType == "mouseover"){
                $(this).children('.t_place_item_set').show();
            }else if(eventType == "mouseout"){
                $(this).children('.t_place_item_set').hide();
            }
        });
        // 添加起点标记
        $('#t_place_area').on('click', '.t_place_item_start', function(){
            var $item = $(this).parents('.t_place_item');
            var $content = $item.find('.t_place_item_content');
            var $type = $item.find('.t_place_item_type');
            var contentText = $content.text();
            self.setStart(contentText);
            if($type.attr('type') == 2){
                $type.html("起点、终点：");
                $type.attr('type', 3);
            }else{
                $type.html("起点：");
                $type.attr('type', 1);
            }
            $content.html(contentText);
            $(this).attr('disabled', 'disabled');
            var $siblingsItem = $item.siblings();
            var $siblingsType = $siblingsItem.find('.t_place_item_type');
            var siblingsTypeLen = $siblingsType.length;
            for(var i=0; i< siblingsTypeLen; i++){
                var iType = $siblingsType.eq(i).attr('type');
                if(iType==1){
                    $siblingsType.eq(i).attr('type', 0);
                    $siblingsItem.find('.t_place_item_type').eq(i).html("");
                }else if(iType==3){
                    $siblingsType.eq(i).attr('type', 2);
                    $siblingsItem.find('.t_place_item_type').eq(i).html("终点：");
                }

            }
            $siblingsItem.find('.t_place_item_start').removeAttr('disabled');
        });
        // 添加终点标记
        $('#t_place_area').on('click', '.t_place_item_end', function(){
            var $item = $(this).parents('.t_place_item');
            var $content = $item.find('.t_place_item_content');
            var $type = $item.find('.t_place_item_type');
            var contentText = $content.text();
            self.setEnd(contentText);
            if($type.attr('type') == 1){
                $type.html("起点、终点：");
                $type.attr('type', 3);
            }else{
                $type.html("终点：");
                $type.attr('type', 2);
            }
            $content.html(contentText);
            $(this).attr('disabled', 'disabled');
            var $siblingsItem = $item.siblings();
            var $siblingsType = $siblingsItem.find('.t_place_item_type');
            var siblingsTypeLen = $siblingsType.length;
            for(var i=0; i< siblingsTypeLen; i++){
                var iType = $siblingsType.eq(i).attr('type');
                if(iType==2){
                    $siblingsType.eq(i).attr('type', 0);
                    $siblingsItem.find('.t_place_item_type').eq(i).html("");
                }else if(iType==3){
                    $siblingsType.eq(i).attr('type', 1);
                    $siblingsItem.find('.t_place_item_type').eq(i).html("起点：");
                }

            }
            $siblingsItem.find('.t_place_item_end').removeAttr('disabled');
        });

    },

    addDemo: function(){
        var arrayEdge = new Array();
        arrayEdge.push(new Edge("A","B",96));
        arrayEdge.push(new Edge("A","C",105));
        arrayEdge.push(new Edge("A","D",50));
        arrayEdge.push(new Edge("A","E",41));
        arrayEdge.push(new Edge("A","F",86));
        arrayEdge.push(new Edge("A","G",46));
        arrayEdge.push(new Edge("A","H",29));
        arrayEdge.push(new Edge("A","I",56));
        arrayEdge.push(new Edge("A","J",70));
        arrayEdge.push(new Edge("B","C",78));
        arrayEdge.push(new Edge("B","D",49));
        arrayEdge.push(new Edge("B","E",94));
        arrayEdge.push(new Edge("B","F",21));
        arrayEdge.push(new Edge("B","G",64));
        arrayEdge.push(new Edge("B","H",63));
        arrayEdge.push(new Edge("B","I",41));
        arrayEdge.push(new Edge("B","J",37));
        arrayEdge.push(new Edge("C","D",60));
        arrayEdge.push(new Edge("C","E",84));
        arrayEdge.push(new Edge("C","F",61));
        arrayEdge.push(new Edge("C","G",54));
        arrayEdge.push(new Edge("C","H",86));
        arrayEdge.push(new Edge("C","I",76));
        arrayEdge.push(new Edge("C","J",51));
        arrayEdge.push(new Edge("D","E",45));
        arrayEdge.push(new Edge("D","F",35));
        arrayEdge.push(new Edge("D","G",20));
        arrayEdge.push(new Edge("D","H",26));
        arrayEdge.push(new Edge("D","I",17));
        arrayEdge.push(new Edge("D","J",18));
        arrayEdge.push(new Edge("E","F",80));
        arrayEdge.push(new Edge("E","G",36));
        arrayEdge.push(new Edge("E","H",55));
        arrayEdge.push(new Edge("E","I",59));
        arrayEdge.push(new Edge("E","J",64));
        arrayEdge.push(new Edge("F","G",46));
        arrayEdge.push(new Edge("F","H",50));
        arrayEdge.push(new Edge("F","I",28));
        arrayEdge.push(new Edge("F","J",8));
        arrayEdge.push(new Edge("G","H",45));
        arrayEdge.push(new Edge("G","I",37));
        arrayEdge.push(new Edge("G","J",30));
        arrayEdge.push(new Edge("H","I",21));
        arrayEdge.push(new Edge("H","J",45));
        arrayEdge.push(new Edge("I","J",25));
        TravelRoute.Calc.init("B", "C", arrayEdge);
        console.log(TravelRoute.Calc.show());
        TravelRoute.Calc.showCalResults();
    }

};
var travelRoute = TravelRoute.Map;

travelRoute.initialize();