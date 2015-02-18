// simple amuse_json collection viewer
// makes display_browser after save_edit function possible
var VIEW = {
  version : "2.1",
  date : "2015-02-18",
  author: "", // option to set in amuse_um.js or amuse_NW.js
  editor: "", // set as function by amuse_um.js or amuse_NW.js if author value not empty
  album_image: -1,
  album: "",
  collection : {},
  file_name : "", // set by amuse_um.js or amuse_NW.js
  full_list : [],
  unsorted_list : [],
  list : [],
  names : {},
  number : 0,
  filter_input : "",
  sort_property : "",
  images : "",
  // start_VIEW called once by amuse_um.js or amuse_NW.js
  // initialises lists and events 
  start_VIEW: function(collection){
    "use strict";
    function start_sort_list(){
      // sort_properties returns list of properties from objects
      // the list of properties is in the order of most frequent use
      function sort_properties(objects){
        var prop_counts, name, prop, list, sorted_list;
        prop_counts = {};
        for (name in objects){
          for (prop in objects[name]){
            if (! (prop in prop_counts)){ prop_counts[prop] = 1; }
            else{ prop_counts[prop] += 1; }
          }
        }
        list = [];
        for (prop in prop_counts){list.push("_"+prop_counts[prop]+"\t"+prop); }
        list = VIEW.nat_sort(list).reverse();
        sorted_list = [];
        
        for (var i=0; i<list.length; i++){ sorted_list.push(list[i].split("\t").pop()); }
        return sorted_list;
      }
    
      var property_list, select, entry;
      property_list = sort_properties(VIEW.collection.objects);
      select = "<p><b>sort objects by property value</b> <select id=\"selected_sort\" "+
        "onchange=VIEW.update_sort_record(selected_sort.value)>";
      select += "<option value=\"\">object_number only</option>";
      for (var i=0; i<property_list.length; i++ ){
        entry = property_list[i];
        select += "<option value=\""+entry+"\">"+entry+"</options>";
      }
      document.getElementById("sort").innerHTML = select+"</select><p>";
      return "";
    }
    
    var objects, id;
    VIEW.collection = collection;
    objects = VIEW.collection.objects;
    VIEW.full_list = [];
    for (id in objects){
      VIEW.full_list.push(id);
    }
    VIEW.full_list = VIEW.nat_sort(VIEW.full_list);
    VIEW.unsorted_list = VIEW.full_list;
    VIEW.list =  VIEW.full_list;
    VIEW.filter_input = "";
    VIEW.sort_property = "";
    document.getElementById("filter_box").value = ""; 
    document.getElementById("object_number").onkeydown = VIEW.krecord_handle;
    document.getElementById("filter_box").onkeydown = VIEW.frecord_handle;
    document.getElementById("clear_button").onclick = VIEW.find_clear;
    document.getElementById("move_down").onclick = function(){VIEW.krecord_handle(40); };
    document.getElementById("move_up").onclick = function(){VIEW.krecord_handle(38); };   
    start_sort_list();
    VIEW.browsing();
    if (VIEW.editor){ VIEW.editor(); }
    else{ document.getElementById("report").innerHTML =
      "Version "+VIEW.version+" ["+VIEW.date+"]"; }
    return "";
  },
  display_browser: function(){
    "use strict";
    var edition, date, html, first_prop, object_number;
    if ("edition" in VIEW.collection){ edition = VIEW.collection.edition; }
    else { edition = ""; }
    if ("date" in VIEW.collection){ date = VIEW.collection.date; }
    else { date = "undated"; }
    html = "<h3>"+VIEW.collection.name+" "+edition+" "+date+"</h3>"+
      "<p class=\"centred\">listed "+VIEW.list.length+" of "+VIEW.full_list.length+
      " objects</p><ul>";
    first_prop = VIEW.collection.$props[0];
    for (var j=0; j<VIEW.list.length; j++){
      object_number = VIEW.list[j];
      html+= "<li><b class=\"show\" onclick='VIEW.display_object(\""+object_number+"\")' >"+
        object_number+"</b>: "+VIEW.collection.objects[object_number][first_prop]+"</li>";
    }
    document.getElementById("browser").innerHTML = html+"</ul>";
    return "";
  },
  browsing: function(){
    "use strict";
    var object_number;
    VIEW.names = {};
    for (var i=0; i<VIEW.list.length; i++){
      VIEW.names[VIEW.list[i]] = i*1;
    }
    VIEW.number = 0;
    if ("image_folder" in VIEW.collection){
      VIEW.images = "../images/"+VIEW.collection.image_folder;
    }
    else{ VIEW.images = "../images/"; }
    VIEW.display_browser();
    object_number = VIEW.list[VIEW.number];
    document.getElementById("object_number").value = object_number;
    VIEW.display_object(object_number);
    return "";
  }, 
  display_object: function(object_number){
    "use strict";
    function display_list(prop, list){
      function add_links(list, ref){
        var html, link;
        html = "";
        for (var i=0; i<list.length; i++ ){
          link = list[i];
          html += "<li><a target=\"_blank\" href=\"../DOCS/"+ref+".html?"+link+"\">"+link+"</a></li>";
        }
        return html;
      }
    
      var html, i;
      if (list.length === 0){return ""; }
      html = "<ul><span class=\"centred\">"+prop+"</span>";
      switch (prop){
        case "$doc_links" :
          html += add_links(list, "AZ_viewer");
          break;
        case "$images":
          i = list.length;
          if (i > 3){
            html += "<li>"+list[0]+"</li><li>...</li><li>"+list[i-1]+"</li>";
          }
          else{
            for (i=0; i<list.length; i++ ){ html += "<li>"+list[i]+"</li>"; }
          }
          break;
        default :
          for (i=0; i<list.length; i++ ){ html += "<li>"+list[i]+"</li>"; }
          break;
      }
      return html+"</ul>";
    }
    function has_value(object, property){
      if (typeof object[property] === "string"){
        return "<li>"+property+" : "+object[property]+"</li>";
      }
      else if (typeof object[property] === "object"){
        return display_list(property, object[property]);
      }
      return "";
    }
    function is_a_part(object_number){
      var part_of;
      if ("part_of" in VIEW.collection.objects[object_number]){
        part_of = VIEW.collection.objects[object_number].part_of;
        if ((part_of in VIEW.collection.objects) && 
            ("has_parts" in VIEW.collection.objects[part_of])){
          return part_of;
        }
      }
      return "";
    }
    function get_key_values(object, key_list, part_of, parts){
      var values, prop, value;
      values = "";
      for (var i=0; i<key_list.length; i++ ){
        prop = key_list[i];
        if (! part_of){
          value = has_value(object, prop);
        } 
        else{
          if (prop === "part_of"){ value = parts; }
          else{ value = has_value(object, prop); }
          if (value === "" && prop !== "has_parts"){
            value = has_value(VIEW.collection.objects[part_of], prop);
          }
        }
        values += value;
      }
      return values;
    }
    function album_init(object){
      function load_album(list){
        function trio(list){
          var html;
          html = "<p><a id=\"a_album0\" target=\"_blank\" href=\""+VIEW.images+
            list[0]+"\" >"+"<img id=\"i_album0\" src=\""+VIEW.images+list[0]+
            "\" /></a>"+"<a id=\"a_album1\" target=\"_blank\" href=\""+VIEW.images+
            list[1]+"\" >"+"<img id=\"i_album1\" src=\""+VIEW.images+list[1]+"\" /></a>";
          if (list.length >= 3){ html += "<a id=\"a_album2\" target=\"_blank\" href=\""+
            VIEW.images+list[2]+"\" >"+"<img id=\"i_album2\" src=\""+
            VIEW.images+list[2]+"\" /></a>";
          }
          return html+"</p>";
        }
    
        var html;
        if (list.length < 2){ // a single entry is displayed as the primary image
          VIEW.album_image = -1;
          VIEW.album = "";
          return ""; 
        }
        VIEW.album_image = 0;
        VIEW.album = list;
        html = trio(list);
        if (list.length > 3){
          html += "<p align=\"center\" >"+
            "<form oninput=\"amount.value=VIEW.album[rangeInput.value]\" >"+
            "<input onclick=\"VIEW.album_change(this)\" type=\"range\""+
            " id=\"rangeInput\" name=\"rangeInput\" min=\"0\" max=\""+
              (list.length-1)+"\" value=\"0\">"+
            "<output name=\"amount\""+" id =\"rangeOutput\" for=\"rangeInput\">"+
              VIEW.album[0]+"</output></form></p>";
        }
        return html;
      }

      var images;
      if ("$images" in object){
        images = [];
        for (var i=0; i<object.$images.length; i++ ){
          images.push(object.$images[i].replace(/^\x20+/g,"")); 
        }
        return "<hr><div id=\"album\" >"+load_album(images)+"</div>"; 
      }
      else{ return ""; }
    }

    var object, content, valid, part_of, parts, view_groups, key_list, group_result;
    document.getElementById("object_number").value = object_number;
    VIEW.number = VIEW.names[object_number];
    object = VIEW.collection.objects[object_number];
    if (("image" in object) && (object.image.toLowerCase().indexOf(".jpg")>0)){
      content = "<div id=\"img_block\"><p><a target=\"_blank\" href=\""+
      VIEW.images+object.image+"\" ><img id=\"primary\" src=\"../images/"+
      VIEW.images+object.image+"\" /></a><br>"+object.image+"</p></div>";
    }
    else if (("primary_image" in object) &&
              (object.primary_image.toLowerCase().indexOf(".jpg")>0) ){
      content = "<div id=\"img_block\"><p><a target=\"_blank\" href=\""+
      object.primary_image+"\" ><img id=\"primary\" src=\""+
      object.primary_image+"\" /></a><br>"+
      object.primary_image.slice(object.primary_image.lastIndexOf("/")+1)+"</p></div>";
    }
    else{ content = ""; }
    content += "<h4>"+object_number+"</h4><ul>";
    valid = false;
    part_of = is_a_part(object_number);
    if (part_of){ 
      parts = "<li>part_of : "+VIEW.collection.objects[part_of].has_parts+"</li>";
    }
    else{ parts = ""; }
    view_groups = VIEW.collection.$groups;
    for (var i=0; i<VIEW.collection.$groups.length; i++ ){
      key_list = VIEW.collection[view_groups[i]];
      if (key_list.length>0){
        group_result = get_key_values(object, key_list, part_of, parts);
        if (group_result){
          valid = true;
          content += "<b>"+view_groups[i]+"</b><ul>"+group_result+"</ul>";
        }
      }
    }
    if (! valid){content += "<li>No properties to display </li>";}
    content += "</ul>";
    document.getElementById("object").innerHTML = content+album_init(object);
    return "";
  },
  // reset_collection  called only from amuse_NW.js or amuse_EDIT.js
  reset_collection: function(){
    "use strict";
    document.getElementById("filter_box").value = "";
    VIEW.filter_input = "";
    document.getElementById("selected_sort").value = "";
    VIEW.sort_property = "";
    VIEW.unsorted_list = VIEW.full_list;
    VIEW.list = VIEW.full_list;
    VIEW.browsing();
    return "";
  },
  krecord_handle: function(e){
    "use strict";
    function trim(text){
      return (text || "").replace(/^\x20+|\x20+$/g,"");
    }

    var keyCode, text, object_number;
    if (typeof e === "number"){keyCode = e; }
    else{
      keyCode = (window.event) ? event.keyCode : e.keyCode;
    }
    if ((keyCode === 9) || (keyCode === 13)){
      text = trim(document.getElementById("object_number").value);
      if (text in VIEW.names){ object_number = text; }
      else{ return ""; }
    }
    else if (keyCode === 40){
      if (VIEW.number < (VIEW.list.length-1)){
        VIEW.number += 1;
        object_number = VIEW.list[VIEW.number];
      }
      else{ return ""; }
    }
    else if (keyCode === 38){
      if (VIEW.number > 0){
        VIEW.number -= 1;
        object_number = VIEW.list[VIEW.number];
      }
      else{ return ""; }
    }
    else{ return ""; }
    document.getElementById("object_number").value = object_number;
    VIEW.display_object(object_number);
    return "";
  },
  frecord_handle: function(e){
    "use strict";
    function trim(text){
      return (text || "").replace(/^\x20+|\x20+$/g,"");
    }
    // match_tags returns list of object_numbers where $tags matches a list of tags
    function match_tags(objects, candidates, tags){
      var list, i, values, j, tag, match, k, value;
      list = [];
      for (i=0; i<candidates.length; i += 1){
        if ("$tags" in objects[candidates[i]]){
          values = objects[candidates[i]].$tags;
          for (j=0; j<tags.length; j += 1){
            tag = tags[j];
            match = false;
            for (k=0; k<values.length; k += 1){
              value = values[k].toLowerCase();
              if (value === tag){
                match = true;
                break;
              }
            }
            if (! match){ break; }
          }
          if (match){ list.push(candidates[i]); }
        }
      }
      return list;
    }          
    // match_keys returns true if all given keys match any one of a list of values
    function match_keys(values, keys){
      var i, key, match, j, value;
      for (i=0; i<keys.length; i++ ){
        key = keys[i];
        match = false;
        for (j=0; j<values.length; j++){
          value = values[j].toLowerCase();
          if (value.indexOf(key) >= 0){
            match = true;
            break;
          }
        }
        if (! match){return false; }
      }
      return true;
    }
    
    var keyCode, text, keywords, list, tags, keys, candidates, object_number, values, prop;
    if (typeof e === "number"){keyCode = e; }
    else{
      keyCode = (window.event) ? event.keyCode : e.keyCode;
    }
    if ( (keyCode === 9) || (keyCode === 13) ){
      VIEW.filter_input = document.getElementById("filter_box").value;
      text = trim(VIEW.filter_input);
      if (! text){
        document.getElementById("filter_box").value = "";
        VIEW.filter_input = "";
        VIEW.unsorted_list = VIEW.full_list;        
        if (VIEW.sort_property){ VIEW.update_sort_record(VIEW.sort_property); }
        else{
          VIEW.list = VIEW.full_list;
          VIEW.browsing();
        }
        return ""; 
      }
      keywords = text.match(/\S+/g); // one or more words separated by white space to array
      list = [];
      tags = [];
      keys = [];
      for (var i=0; i<keywords.length; i += 1){
        if (keywords[i].charAt(0) === "#"){
          tags.push(keywords[i].slice(1).toLowerCase()); // remove # prefix
        }
        else{ keys.push(keywords[i].toLowerCase()); }
      }
      if (tags.length > 0){
        candidates = match_tags(VIEW.collection.objects, VIEW.full_list, tags);
      }
      else{ candidates = VIEW.full_list; }
      if ((candidates.length > 0) && (keys.length > 0)){
        for (var j=0; j<candidates.length; j += 1){
          object_number = candidates[j];
          values = [];
          for (prop in VIEW.collection.objects[object_number]){
            if (prop.charAt(0) === "$"){ 
              values.push(VIEW.collection.objects[object_number][prop].join(",").toLowerCase());
            }
            else { values.push(VIEW.collection.objects[object_number][prop].toLowerCase()); }
          }
          if (match_keys(values, keys)){ list.push(object_number); }
        }
      }
      else{ list = candidates; }
      if (list.length >0){
        VIEW.unsorted_list = list;
        if (! VIEW.sort_property){
          VIEW.list = list;
          VIEW.browsing();
        }
        else{
          VIEW.update_sort_record(VIEW.sort_property);
        }
      }
      else{
        alert("No records matching "+text+" found");
        document.getElementById("filter_box").value = "";
        VIEW.filter_input = "";
        VIEW.unsorted_list = VIEW.full_list;
        VIEW.update_sort_record(VIEW.sort_property);
      }
    }
    return "";
  },
  find_clear: function(){
    "use strict";
    document.getElementById("filter_box").value = "";
    VIEW.unsorted_list = VIEW.full_list;
    if (VIEW.sort_property){ VIEW.list = VIEW.objects_sorted_list(false); }
    else{ VIEW.list = VIEW.unsorted_list; }
    VIEW.browsing();
    return "";
  },
  // nat_sort: return text list sorted according to natural sort numerical sorting
  nat_sort : function(list){
    "use strict";
    var slist, parse_string, a_, b_;
    slist = list;
    parse_string = /(\D*)(\d*)(\D*)(\d*)(\D*)(\d*)(\D*)(\d*)(.*)/;
    slist.sort(function(a,b){ 
      if (a===b) { return 0; }
      a_ = a.match(parse_string);
      b_ = b.match(parse_string);
      if (a_[1]!==b_[1]) { return a_[1] < b_[1] ? -1 : 1; }
      if (a_[2]!==b_[2]) { return (+a_[2]) - (+b_[2]); }
      if (a_[3]!==b_[3]) { return a_[3] < b_[3] ? -1 : 1; }
      if (a_[4]!==b_[4]) { return (+a_[4]) - (+b_[4]); }
      if (a_[5]!==b_[5]) { return a_[5] < b_[5] ? -1 : 1; }
      if (a_[6]!==b_[6]) { return (+a_[6]) - (+b_[6]); }
      if (a_[7]!==b_[7]) { return a_[7] < b_[7] ? -1 : 1; }
      if (a_[8]!==b_[8]) { return (+a_[8]) - (+b_[8]); }
      return a_[9] < b_[9] ? -1 : 1;
    });
    return slist;
  },
  objects_sorted_list: function(filter_property){
    "use strict";
    var list, prop_name, prop_value, sorted_list;
    list = [];
    for (var i=0; i<VIEW.unsorted_list.length; i++ ){
      prop_name = "";
      if (VIEW.sort_property in VIEW.collection.objects[VIEW.unsorted_list[i]]){
        prop_value = VIEW.collection.objects[VIEW.unsorted_list[i]][VIEW.sort_property];
        if (prop_value || ! filter_property){ prop_name = prop_value+"\t"+prop_name; }
        else{ prop_name = ""; }
      }
      else{ prop_name = ""; }
      if (prop_name || ! filter_property){ list.push(prop_name+"\t"+VIEW.unsorted_list[i]); }
    }
    sorted_list = VIEW.nat_sort(list);
    list = []; // remove property headers
    for (var j=0; j<sorted_list.length; j++ ){
      list.push(sorted_list[j].split("\t").pop());
    }
    return list;
  },
  update_sort_record: function(property){
    "use strict";
    function discard_sort(){
      VIEW.sort_property = "";
      document.getElementById("selected_sort").value = "";
      VIEW.list = VIEW.unsorted_list;
      VIEW.browsing();
      return "";
    }
    
    var current_filter, old_sort;
    current_filter = document.getElementById("filter_box").value;
    if (current_filter !== VIEW.filter_input){ VIEW.frecord_handle(13); }
    
    if (! property){
      discard_sort();
      return "";
    }
    old_sort = VIEW.sort_property;
    VIEW.sort_property = property;
    VIEW.list = VIEW.objects_sorted_list(true);
    if (VIEW.list.length > 0){
      VIEW.browsing();
    }
    else{ 
      alert("The currently selected objects have no sort property "+VIEW.sort_property);
      if (old_sort !== VIEW.sort_property){
        document.getElementById("selected_sort").value = old_sort;     
        VIEW.update_sort_record(old_sort);
      }
      else{ discard_sort(); }
    }
    return "";
  },
  album_change: function(node){
    "use strict";
    var i, bound;
    i = parseInt(node.value, 10);
    bound = VIEW.album.length-3;
    VIEW.album_image = i;
    if (i>bound){ i = bound; }
    document.getElementById("a_album0").href = VIEW.images+VIEW.album[i];
    document.getElementById("a_album1").href = VIEW.images+VIEW.album[i+1];
    document.getElementById("a_album2").href = VIEW.images+VIEW.album[i+2];
    document.getElementById("i_album0").src = VIEW.images+VIEW.album[i];
    document.getElementById("i_album1").src = VIEW.images+VIEW.album[i+1];
    document.getElementById("i_album2").src = VIEW.images+VIEW.album[i+2];
  }
 
};
