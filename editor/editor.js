<?php
namespace SuperIntuitive;
header("Content-Type: application/javascript; charset: UTF-8");

session_start();
require_once dirname(__DIR__).DIRECTORY_SEPARATOR.'core'.DIRECTORY_SEPARATOR.'Tools.php';
Tools::DefineServer();

error_reporting(E_ALL ^ E_WARNING); 

   // echo $siobj;
if (Tools::UserHasRole('Admin')) 
{


    $notsuperadmin = "true";
    $notdomainadmin = "true";
    if (Tools::UserHasRole('SuperAdmin')) { $notsuperadmin = "false"; $notdomainadmin = "false"; } 
    if (Tools::UserHasRole('DomainAdmin')) { $notdomainadmin = "false"; }

    $plugs = new Plugins();
    $downloadedplugs = $plugs->GetLocalPlugins('downloaded');
    $downloadedplugs = json_encode($downloadedplugs);
     //Tools::Log($downloadedplugs);

    $currentPlugins = array();
    $installedplugs = $plugs->GetLocalPlugins('installed');

    foreach($installedplugs as $plugin){
        if (!isset($currentPlugins[$plugin])) {
            $currentPlugins[$plugin] = array();
            $currentPlugins[$plugin]['scripts'] = array();
            $currentPlugins[$plugin]['styles'] = array();
        }
        //get scripts
        $scripts = glob( $_SERVER["DOCUMENT_ROOT"].DIRECTORY_SEPARATOR."plugins".DIRECTORY_SEPARATOR."installed".DIRECTORY_SEPARATOR.$plugin.DIRECTORY_SEPARATOR."scripts".DIRECTORY_SEPARATOR."*.js" );  
        if (count($scripts)>0) {
            foreach($scripts as $script) {
                $name = pathinfo($script, PATHINFO_FILENAME);
                $currentPlugins[$plugin]['scripts'][$name] = file_get_contents($script);
            }
        }
        //get styles
        $styles = glob($_SERVER["DOCUMENT_ROOT"].DIRECTORY_SEPARATOR."plugins".DIRECTORY_SEPARATOR."installed".DIRECTORY_SEPARATOR.$plugin.DIRECTORY_SEPARATOR."styles".DIRECTORY_SEPARATOR."*.css");
        if (count($styles) > 0) {
            foreach($styles as $style) {
                $name = pathinfo($style, PATHINFO_FILENAME);
                $currentPlugins[$plugin]['styles'][$name] = file_get_contents($style);
            }
        }
    }
    if ($currentPlugins) {
        $currentPlugins = json_encode($currentPlugins);
    } else {
        $currentPlugins = "{}";
    }
    
    //get misc data that is needed
    $miscdata = new MiscData();  //this is a grab bag of stuff until i get a better data tree going. 

    //get the users settings here
    $openMethod = isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['prefs']['open_link_in']) ? $_SESSION['SI']['user']['prefs']['open_link_in'] : 'window';

    $helplinks = isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['settings']['HelpLinks']) ? _SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['settings']['HelpLinks'] : 'true';
  
    $showMoz = isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['help']['moz']) ? $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['help']['moz'] : 'false';
    $showW3 = isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['help']['w3']) ? $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['help']['w3'] : 'false';

    $helplinks = "['mdn','w3']";


    $showMoz = $helplinks;
    $showW3 = $helplinks;



    //Get all the media objects
    $mediaObjects = json_encode($_SESSION['SITMP']['media']);
    $pageObjects = json_encode($_SESSION['SITMP']['pages']);
    $blockObjects = json_encode($_SESSION['SITMP']['blocks']);
    unset($_SESSION['SITMP']);

    //Get all the relations 
    $relationentities = new Entity('relations');
    $relations = $relationentities->Retrieve();
    $relationsjson = json_encode($relations);
    //Tools::Log($relations);


    $settingsentities = new Entity('settings');
    $settings = $settingsentities -> Retrieve('id,settingname,settingvalue');
    $settings2 = json_encode($settings);
    $tmpSetting = array();
    /*
    foreach($settings as $setting){
        $tmpSetting[$setting['settingname']] = $setting['settingvalue'];
    }
    $settings = $tmpSetting;
    //Tools::Log($settings);
    $settingsjson = json_encode($settings);
*/
    //colornames
    $colors = $miscdata->ColorNames;
    $coloroptions = "<option value=''>Color Names</option>";
    foreach($colors as $col){
        $coloroptions.= "<option style='background-color:$col;' value='$col' >$col</option>";
    }

    //Get Languages
    $langs = $miscdata->Languages;
    //$langoptions = "'";
    $langoptions = "<option value=''></option>";
   // $detectedlang = strtolower(explode(",", $_SERVER['HTTP_ACCEPT_LANGUAGE'])[0]);
    foreach($langs as $k=>$v){
        $selected = '';//(strtolower($k) == $detectedlang ? "selected='selected'" : "");
        $langoptions.="<option value='$k' $selected >$v</option>";
    }
    //$langoptions.= "'";

    if(isset($settings['DefaultLanguage'])) {
        $defaultLanguage = $settings['DefaultLanguage'];
    }else if(isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])){
        $defaultLanguage = substr($_SERVER['HTTP_ACCEPT_LANGUAGE'], 0, 2);
    }else{
        $defaultLanguage = 'en';
    }
    //$defaultLanguage = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['defaultlanguage'];

    $myLangs = json_encode(explode(',',explode(';',$_SERVER['HTTP_ACCEPT_LANGUAGE'])[0]));

    $supportedLanguages = null;
    //Tools::Log($defaultLanguage);
    if (isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities']['localtext']['attributes'])) {
        $langfields = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities']['localtext']['attributes'];
        foreach($langfields as $field=>$cols){
            if (Tools::StartsWith($field, "_")){
                $code = str_replace('_', '', $field);
                $name = $langs[$code];
                $supportedLanguages.="<option value='$code' >$name</option>";
            }
        }
    }

    $lanent = new Entity('localtext');
    
    $localtexts = json_encode($lanent->Retrieve());
     // Tools::Log($localtexts);

    //getDefaultQuickMenu items
    $quickmenuitems = $miscdata->UserDefaultQuickmenu;

    $u = new User();
    $users = $u->GetUsersForEditor();

    $dt = new DataTable("users");
   // Tools::Log($users);
    $dt->Numbered = true;
    $dt->Selectable = true;

    $dt->LoadArray($users);

    $usrconfstyle = 'height:28px; width:28px; margin:3px; background-size:contain;';
    $configbts = [
        "<input type='button'  title='Change Password' style=' $usrconfstyle background-image: url(\\\"/editor/media/icons/resetpw.png\\\");' onclick='SI.Editor.Objects.User.ChangePassword(this)' />",
        "<input type='button'  title='Manage Roles'    style=' $usrconfstyle background-image: url(\\\"/editor/media/icons/securityroles.png\\\");' onclick='SI.Editor.Objects.User.GetRoles(this)' />",
        "<!--<input type='button'  value='DELETE'   onclick='SI.Editor.Objects.User.Delete(this)' />-->",
    ];
    $confbtn = new DataColumn("Configure");
    $confbtn->Default = implode($configbts);
    $dt->AddColumn($confbtn);
    $options = ["ID"=> "si_editor_users_table"];
    $usertable = $dt->Draw($options);
    //Tools::Log($usertable, true);
    //Security Roles 
    $roles = new Entity('securityroles');
    $rolesdata = $roles->Retrieve();
    foreach($rolesdata as $i=>$roleent){
        if (isset($roleent['rules'])) {
            $obj = json_decode($roleent['rules']);
            $rolesdata[$i]['rules'] = array();
            $rolesdata[$i]['rules'] = $obj;
        }
    }
    $rolesdata = json_encode($rolesdata);

    $EasyPassword = '/^(?=.*\d)(?=.*[a-zA-Z]).{6,}$/gm';
    $HardPassword = '/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm';
    $PasswordStrength = $HardPassword;

    $allmimetypes = json_encode($miscdata->MimeTypes);
    $mimes = "{
        'Images': ['image/png', 'image/bmp', 'image/jpeg', 'image/svg', 'image/gif'],
        'Audio': ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/midi', 'audio/ogg', 'audio/flac','audio/webm'],
        'Video': ['video/avi', 'video/mpeg', 'video/mp4', 'video/ogg','video/webm'],
        'Docs': ['application/pdf', 'application/msword'],
        'Data': ['application/xml', 'application/json','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        'Fonts': ['application/x-font-ttf', 'application/x-font-otf']
        }";

    $sessionPageData = json_encode($_SESSION['SI']);

    $htmlElementsAge = filemtime($_SERVER['DOCUMENT_ROOT'].DIRECTORY_SEPARATOR."editor".DIRECTORY_SEPARATOR."media".DIRECTORY_SEPARATOR."data".DIRECTORY_SEPARATOR."html_elements.json");
    $htmlAttributesAge = filemtime($_SERVER['DOCUMENT_ROOT'].DIRECTORY_SEPARATOR."editor".DIRECTORY_SEPARATOR."media".DIRECTORY_SEPARATOR."data".DIRECTORY_SEPARATOR."html_attributes.json");
    $cssPropertiesAge = filemtime($_SERVER['DOCUMENT_ROOT'].DIRECTORY_SEPARATOR."editor".DIRECTORY_SEPARATOR."media".DIRECTORY_SEPARATOR."data".DIRECTORY_SEPARATOR."css_properties.json");
    $jsMethodsAge = filemtime($_SERVER['DOCUMENT_ROOT'].DIRECTORY_SEPARATOR."editor".DIRECTORY_SEPARATOR."media".DIRECTORY_SEPARATOR."data".DIRECTORY_SEPARATOR."js_methods.js");
    $phpMethodsAge = filemtime($_SERVER['DOCUMENT_ROOT'].DIRECTORY_SEPARATOR."editor".DIRECTORY_SEPARATOR."media".DIRECTORY_SEPARATOR."data".DIRECTORY_SEPARATOR."php_methods.json");
    $sqlMethodsAge = filemtime($_SERVER['DOCUMENT_ROOT'].DIRECTORY_SEPARATOR."editor".DIRECTORY_SEPARATOR."media".DIRECTORY_SEPARATOR."data".DIRECTORY_SEPARATOR."sql_methods.json");
    $cssNew = filemtime($_SERVER['DOCUMENT_ROOT'].DIRECTORY_SEPARATOR."editor".DIRECTORY_SEPARATOR."media".DIRECTORY_SEPARATOR."data".DIRECTORY_SEPARATOR."css_new.json");
    $cssPseudo = filemtime($_SERVER['DOCUMENT_ROOT'].DIRECTORY_SEPARATOR."editor".DIRECTORY_SEPARATOR."media".DIRECTORY_SEPARATOR."data".DIRECTORY_SEPARATOR."css_pseudo.json");

    $dataage = "html_elements: $htmlElementsAge,
            html_attributes: $htmlAttributesAge,
            css_properties: $cssPropertiesAge,
            js_methods : $jsMethodsAge,
            php_methods : $phpMethodsAge,
            sql_methods : $sqlMethodsAge,
            css_new : $cssNew,
            css_pseudo: $cssPseudo
           ";
    //echo $dataage;

    $entities =  $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities'];
    $entityDefinitions = json_encode($entities);
    //deprecate
    $entityInfo = $entityDefinitions;

    $entityData = array();
    $recordCount = count($entities);
    $entityJson = "";

?> 
"use strict";
if(!SI){ var SI = {};}
if(!SI.Editor) { SI.Editor = {}; }
if(!SI.Editor.Objects) { SI.Editor.Objects = {}; }

SI.Editor = {
    Style: {
        BackColor: 'black',
        FavoriteColor:'teal',
        BackgroundColor: 'rgb(72, 75, 87)',
        TextColor: 'rgb(172, 175, 187)',
        MenuColor: 'slategrey',
        ButtonColor: '#9A9',
        DraggerColor: '#99A',
        FontFace: 'Roboto',
        SetTheme: function () {
            let theme = SI.Theme.UserPreference;
            if (theme) {
                if (theme === 'light') {
                    SI.Editor.Style.BackColor = 'white',
                        SI.Editor.Style.BackgroundColor = '#AAA';
                    SI.Editor.Style.TextColor = '#111';
                    SI.Editor.Style.MenuColor = '#777';
                    SI.Editor.Style.ButtonColor = '#345';
                    SI.Editor.Style.DraggerColor = '#234';
                }
                else {
                    SI.Editor.Style.BackgroundColor = 'rgb(72, 75, 87)';
                    SI.Editor.Style.TextColor = 'rgb(172, 175, 187)';
                    SI.Editor.Style.MenuColor = 'slategrey';
                    SI.Editor.Style.ButtonColor = '#9A9';
                    SI.Editor.Style.DraggerColor = '#99A';
                }
            }

        }
    },
    Run: function () {
        console.time('EditorLoadTime');
        SI.Editor.Data.Init(); 
        //wait for all the code to load before continuing. 
        var starttimmer = setInterval(function () {
            if (SI.Editor.Data.loaded) {
                clearInterval(starttimmer);
                SI.Editor.Style.SetTheme();
                SI.Editor.Objects.Elements.Init();
                SI.Editor.UI.Init();
            }
        }, 50);
        console.timeEnd('EditorLoadTime');
        console.log(SI.Editor);
        //check for lookups
        let lookup = SI.Tools.Object.GetIfExists("SI.Widgets.Lookup.Lookup");
        if(lookup){
            lookup.CheckLookups();
        }
    },
    Data: {
        loaded : false,
        html_elements: {},
        html_attributes: {},
        css_properties: {},
        js_methods: {},
        php_methods: {},
        sql_methods: {},
        DataAge: { 
            <?= $dataage ?>        
        },
        Code: {},
        DataLists: {
            HtmlElementDataList: null,
            HtmlAttributeDataList: null,
            CssPropertiesDataList: null,
            JsMethodsDataList: null,
            PhpMethodsDatalist: null,
            SqlMethodsDataList: null, 
            AcceptedMimeTypes: <?=$mimes ?>,
            AdminData:<?= $sessionPageData ?>,
            ImportRules: [],
            MediaRules: {},
            FontFaces: {},
            PageRules: { Allowed: ['margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom',"orphans","widows"]},
            AnimationNames: [],
        },
        Init: function () {
            var codes = ["html_elements", "html_attributes", "css_properties", "js_methods", "php_methods", "sql_methods"];
            let loadedcount = 0;
            codes.forEach(function (codetype) {
                let lastmoddate = codetype + "_last_modified";
                let timestamp = localStorage.getItem(lastmoddate);   
                let jsonstring = localStorage.getItem(codetype);
                if ( timestamp === "undefined" || (SI.Editor.Data.DataAge[codetype] != null && timestamp <= SI.Editor.Data.DataAge[codetype] && jsonstring === null)  ) {
                    var request = new XMLHttpRequest();
                    try {
                        request.onreadystatechange = function () {
                            if (this.readyState == 4 && this.status == 200) {
                                if (request.responseText.length > 0) {
                                    SI.Tools.Storage.OverwriteStorage(codetype, request.responseText);
                                    SI.Tools.Storage.OverwriteStorage(codetype + "_last_modified", SI.Editor.Data.DataAge[codetype]);
                                    SI.Editor.Data[codetype] = JSON.parse(request.responseText);
                                    loadedcount++;
                                    if (loadedcount == codes.length) {
                                        SI.Editor.Data.loaded = true;
                                    }
                                }
                            }
                        };
                        request.open("GET", '/editor/media/data/' + codetype + '.json', true);
                        request.send();
                    }
                    catch (e) {
                        SI.Tools.Warn(e);
                    }
                } else {
                    if (jsonstring != null && jsonstring.length > 0) {
                        try {
                            SI.Editor.Data[codetype] = JSON.parse(jsonstring);
                            loadedcount++;
                            if (loadedcount == codes.length) {       
                                SI.Editor.Data.loaded = true;
                            }
                        } catch (ex) {
                            SI.Tools.Warn(ex);                           
                        }
                    }
                }
            });
            
            SI.Editor.Data.Tools.SupplementData();
        },
        OptionSets: {
            HTML: {
              Elements:{}
            },
            CSS: {
                Keyframes: [],
                FontFaces: [],
                Media: [],
                GlobalValues: ['initial', 'inherit', 'unset'],
                Properties: {},
                PseudoClasses: [],
                PseudoElements: [],
                Colors: "<?= $coloroptions ?>", 
            },
            Language: {
                All : "<?= $langoptions ?>",
            },
        },
        Objects: {
            Blocks: <?= $blockObjects ?>,
            Pages: <?= $pageObjects ?>,
            Media: <?= $mediaObjects ?>,
            Users: "<?= $usertable ?>",
            Entities: {
                Count: <?= $recordCount ?>,
                Definitions: <?= $entityDefinitions ?>,
                Relationships:  <?= $relationsjson ?>,
                Lists: {
                    FwdRevLookup: {},
                    NotAllowedNames: ['domain', 'domains', 'subdomain', 'subdomains', 'entity', 'entities'],
                    NotAllowedAttributes: ['p_id', 'id', 'status', 'statusreason', 'createdon', 'modifiedon', 'entity_id'],
                },
            },
            Language: {
                Current: <?= $localtexts ?>,
                CurrentPreference: "<?= SI_LANGS ?>",
                Installed: <?= $myLangs ?>,
                SupportedLanguages: "<?= $supportedLanguages ?>",
                Options: "<?= $langoptions ?>"
            },
            Deployment: {
                Levels: {
                    test: {
                        Label: "",
                        ToolTip: 'Promote to Test',
                        BackgroundColor: "green",
                        MinWidth: "18px",
                        MinHeight: "18px",
                        Shadow: '3px 3px 3px rgba(0,128,0,0.2)',
                        BorderRadius: '9px',
                    },
                    live: {
                        Label: "",
                        ToolTip: 'Promote to Live',
                        BackgroundColor: "yellow",
                        MinWidth: "18px",
                        MinHeight: "18px",
                        Shadow: '3px 3px 3px rgba(255,255,0,0.2)',
                        BorderRadius: '9px',
                    },
                    rollback: {
                        Label: "",
                        ToolTip: 'Save to Rollback',
                        BackgroundColor: "red",
                        MinWidth: "18px",
                        MinHeight: "18px",
                        Shadow: '3px 3px 3px rgba(255,0,0,0.2)',
                        BorderRadius: '9px',
                    }
                },
                UI: function (options) {
                    this.Defaults = {
                        "EntityName": null,
                        "EntityId": null,
                        "Attribute": null,
                        "Parent": null,
                        "LabelMargin": null,
                    };
                    this.options = SI.Tools.Object.SetDefaults(options, this.Defaults);
                    if (this.options.EntityName != null && this.options.EntityId != null && this.options.Attribute != null) {
                        let box = Ele("div", {
                            style: {
                                cursor: 'default',
                            }
                        });
                        //debugger;
                        //add the label
                        let label = Ele("span", {
                            innerHTML: options.Attribute,
                            appendTo: box,
                        });
                        if (options.LabelMargin) {
                            label.style.marginRight = options.LabelMargin;
                        }
                        let deployments = SI.Editor.Data.Objects.Deployment.Levels;
                        for (let deployment in deployments) {
                            //debugger;
                            let props = deployments[deployment];
                            Ele("button", {
                                id: 'si_edit_promote_' + options.Attribute + "_" + deployment,
                                title: props.ToolTip,
                                style: {
                                    display: "inline-block",
                                    borderRadius: props.BorderRadius,
                                    border: 'none',
                                    boxShadow: props.Shadow,
                                    margin: "4px",
                                    marginLeft: "7px",
                                    padding: "2px",
                                    paddingLeft: "5px",
                                    paddingRight: "5px",
                                    height: "18px",
                                    backgroundColor: props.BackgroundColor,
                                    minWidth: props.MinWidth,
                                    cursor: 'pointer',
                                },
                                data: {
                                    entityid: options.EntityId,
                                    entityname: options.EntityName,
                                    deployment: deployment,
                                    attribute: options.Attribute,
                                },
                                innerHTML: props.Label,
                                onclick: function (e) {
                                    //debugger;
                                    let entityid = this.dataset.entityid;
                                    let deployment = this.dataset.deployment;
                                    let entityname = this.dataset.entityname;
                                    let attribute = this.dataset.attribute;
                                    let data = { KEY: 'Promote', deployment: deployment, entityname: entityname, entityid: entityid, attribute: attribute };
                                    let ajax = { Url: SI.Editor.Ajax.Url, Data: data, };
                                    //   console.log(ajax);
                                    SI.Editor.Ajax.Run(ajax);

                                    e.stopPropagation();
                                },
                                appendTo: box,
                            });
                        }
                        if (options.Parent == null) {
                            return box;
                        } else {
                            let pop = document.querySelector(options.Parent);
                            if (pop) {
                                pop.appendChild(box);
                            }
                        }

                    }
                },
                Promoted: function (val) {
                    SI.Tools.SuperAlert(val, 1500);
                    console.log(val);
                },

            },
            Plugins: {
                Current: <?= $currentPlugins ?>,
                Downloaded: <?= $downloadedplugs ?>,
            },
            Security: {
                Operations: ['create', 'read', 'write', 'append', 'appendTo', 'delete'],
                Roles: <?= $rolesdata ?>,
            },
            Settings: <?= $settings2 ?>,
            PhpInfo : `<?php echo Tools::GetPhpInfo() ?>`,
            MimeTypes: <?= $allmimetypes ?>
        },
        User: {
            HelpLinks: <?= $helplinks ?>,
            Languages: <?= $myLangs ?>,
            QuickMenuItems: <?= $quickmenuitems ?>,
            PasswordStrength: <?= $PasswordStrength ?>,
        },
        Site: {
            Domain: "<?= SI_DOMAIN_NAME ?>",
            SubDomain: "<?= SI_SUBDOMAIN_NAME ?>",
            SessionPageData:  <?= $sessionPageData ?>,
        },
        Tools: {
            GetFileSize: function (path) {
                var ajax = new XMLHttpRequest();
                ajax.open('HEAD', path, true);
                ajax.onreadystatechange = function () {
                    if (ajax.readyState == 4) {
                        if (ajax.status == 200) {
                            return ajax.getResponseHeader('Content-Length');
                        } else {
                            return null;
                        }
                    }
                };
                ajax.send(null);
            },
            GetStyleByName: function (name) {
                for (let i in SI.Editor.Data.css_properties) {
                    let group = SI.Editor.Data.css_properties[i];
                    for (let j in group) {
                        if (group[j].n === name) {
                            SI.Editor.Data.css_properties[i][j].group = i;
                            SI.Editor.Data.css_properties[i][j].index = j;
                            return SI.Editor.Data.css_properties[i][j];
                        }
                    }
                }
            },
            //GetAttributesByName returns the first instance of the attribute. there are several listed under multiple divs. they are not guaranteed unless a group is specified
            GetAttributeByName: function (name, group=null) {
                for (let i in SI.Editor.Data.html_attributes) {
                    let curgroup = SI.Editor.Data.html_attributes[i];
                    if (curgroup == group || group == null) {
                        for (let j in curgroup) {
                            //debugger;
                            if (curgroup[j].s === name) {
                                //debugger;
                                SI.Editor.Data.html_attributes[i][j].curgroup = i;
                                SI.Editor.Data.html_attributes[i][j].index = j;
                                return SI.Editor.Data.html_attributes[i][j];
                            }
                        }
                    }
                }
            },
            SupplementData: function () {
                this.EntityData = function () {
                    //Build the Entity Not allowed names and the Guid reverse lookup list 
                    let info = SI.Editor.Data.Objects.Entities.Definitions;
                    let notallowednames = SI.Editor.Data.Objects.Entities.Lists.NotAllowedNames;
                    let entkey = {}
                    for (let ent in info) {
                        let entdata = info[ent]
                        if (typeof entdata.instanceguid !== 'undefined') {
                            entkey[entdata.instanceguid] = ent;
                            entkey[ent] = entdata.instanceguid;
                            //debugger;
                            //This list will be checked when time to make a new entity. 
                            if (typeof notallowednames[ent] === 'undefined')  {
                                notallowednames.push(ent);
                            }
                            //Entity Options
                            if (typeof entdata.entityoptions !== 'undefined' && entdata.entityoptions) {
                                //dont allow a singular name to be used as a new ent name either
                                if (typeof entdata.entityoptions['SN'] !== 'undefined' && notallowednames.indexOf(entdata.entityoptions.SN) === -1) {
                                      notallowednames.push(entdata.entityoptions.SN);
                                }
                            }
                        }
                    }
                    SI.Editor.Data.Objects.Entities.Lists.FwdRevLookup = entkey;
                    SI.Editor.Data.Objects.Entities.Lists.NotAllowedNames = notallowednames;
                };
                //the relations data is nothign but guids. lets try to make this more readable and useable
                this.RelationsData = function () {  
                    //Relations data has only entity guid names. use the reverse lookup from EntityData to get the names to make it easy to read.
                    let relations = SI.Editor.Data.Objects.Entities.Relationships;
                    let lookup = SI.Editor.Data.Objects.Entities.Lists.FwdRevLookup;
                    for (let r in relations) {
                        let relation = relations[r];
                        let childid = relation.childentity_id;
                        if (typeof lookup["0x" + childid]!== 'undefined') {
                            relation.childentity_name = lookup["0x" + childid];
                        }
                        let parentid = relation.parententity_id;
                        if (typeof lookup["0x" + parentid] !== 'undefined') {
                            relation.parententity_name = lookup["0x" + parentid];
                        }
                    }
                };
                this.StyleData = function () {
                    /*
                    if (SI.Editor.Data.Code.Styles) {
                        SI.Editor.Data.DataLists.StyleGroups = {};
                        let styleGroupOrder = "";
                        for (let i in SI.Editor.Data.Objects.Settings){
                            if (SI.Editor.Data.Objects.Settings[i].hasOwnProperty("settingname") && SI.Editor.Data.Objects.Settings[i]["settingname"] === "StyleGroupOrder") {
                                styleGroupOrder = SI.Editor.Data.Objects.Settings[i]["settingvalue"];
                                break;
                            }
                        }
                        if (styleGroupOrder.length>0) {
                            let existGroups = styleGroupOrder.split(",");
                            for (let group of existGroups) {
                                SI.Editor.Data.DataLists.StyleGroups[group] = [];
                            }
                        } 
                        let styles = SI.Editor.Data.Code.Styles;
                        for (let i in styles) {
                            if (styles.hasOwnProperty(i)) {
                                let style = styles[i];
                                //Get the unique Groups
                                if (style.groups) {
                                    for (let group of style.groups) {
                                        if (!SI.Editor.Data.DataLists.StyleGroups[group]) {
                                            SI.Editor.Data.DataLists.StyleGroups[group] = [];
                                        }
                                        SI.Editor.Data.DataLists.StyleGroups[group].push(i);
                                    }
                                }
                            }
                        }
                    }
                    */
                };
                this.AtData = function () {
                    //@keyframenames are the same as animation names. find them and set them. too bad there isnt a window object that holds all Animation Names.
                    let sheets = document.styleSheets;
                    for (let i = 0; i < sheets.length; i++) {
                        let sheet = sheets[i];
                        if (sheet.href !== null) {
                            if (sheet.href.includes('style/plugins') || sheet.href.includes('style/page')) {
                                let rules = sheet.cssRules;
                                for (let j = 0; j < rules.length; j++) {
                                    let rule = rules[j];
                                    //Import Runles
                                    if (rule.type === 3) {
                                        let href = rule.href;
                                        if (!SI.Editor.Data.DataLists.ImportRules.includes(href)) {
                                            SI.Editor.Data.DataLists.ImportRules.push(href);
                                        }
                                    }
                                    //get Media Rules
                                    if (rule.type === 4) {
                                        let ctxt = rule.conditionText;
                                        if (!SI.Editor.Data.DataLists.MediaRules[ctxt]) {
                                            SI.Editor.Data.DataLists.MediaRules[ctxt] = [];
                                        }
                                      
                                        mediaRules = rule.cssRules;
                                        for (let k = 0; k < mediaRules.length; k++) {
                                            SI.Editor.Data.DataLists.MediaRules[ctxt].push(mediaRules[k].cssText);
                                        }
                                    }
                                    //get font faces
                                    if (rule.type === 5) {
                                        let ffstyles = rule.style;
                                        if (ffstyles.fontFamily) {
                                        //we must have a font face family
                                            if (!SI.Editor.Data.DataLists.FontFaces[ffstyles.fontFamily]) {
                                                SI.Editor.Data.DataLists.FontFaces[ffstyles.fontFamily] = {};
                                            }
                                            let ittr = 0;
                                            while (ffstyles[ittr]) {
                                                if (ffstyles[ittr] !== "font-family") {
                                                    let ffstyle = ffstyles[ittr];
                                                    let ffprop = ffstyles[ffstyle];
                                                    SI.Editor.Data.DataLists.FontFaces[ffstyles.fontFamily][ffstyle] = ffprop;
                                                }
                                                ittr++;
                                            }
                                        }
                                    }
                                    //get page printer rules
                                    if (rule.type === 6) {
                                        let pgstyles = rule.style;
                                        let ittr = 0;
                                        while (pgstyles[ittr]) {
                                            if (pgstyles[ittr] !== "font-family") {
                                                let pgstyle = pgstyles[ittr];
                                                if (SI.Editor.Data.DataLists.PageRules.Allowed.indexOf(pgstyle)>-1) {
                                                    let pgprop = pgstyles[pgstyle];
                                                    SI.Editor.Data.DataLists.PageRules[pgstyle] = pgprop;
                                                }
                                            }
                                            ittr++;
                                        }
                                    }
                                    //get Animation Names
                                    if (rule.type === 7) {
                                        let name = rule.name;
                                        if (!SI.Editor.Data.DataLists.AnimationNames.includes(name)) {
                                            SI.Editor.Data.DataLists.AnimationNames.push(name);
                                        }
                                    }
                                }
                            }
                        }
                    }
                };


                //run our data functions
                this.EntityData();
                this.RelationsData();//dependent on the function above it to have run.
                this.StyleData();
                this.AtData();
            },
        }
    },
    UI:{
        Container: null,
        Init: function (){
            //Initialize main visible panel
            SI.Editor.UI.DrawAppContainer();
            SI.Editor.UI.MainMenu.Init();
            //Initalize 3 sub menus
            let editorPanels = ["AddPanel", "EditPanel", "ToolsPanel"];
            for (let i in editorPanels) {
                let title = editorPanels[i];
                SI.Editor.UI[title].Init();
            }
            //Initialize Windows
           // setTimeout(function(){ //this set timeout fixes a timing issue in xDebug and is not needed otherwise
          //  for (let i in SI.Editor.UI.Windows) {
          //      let title = SI.Editor.UI.Windows[i];
          //      SI.Editor.UI[title].Init();
          //  }
            SI.Editor.UI.SetDocumentEvents();
 
        },
        SetDocumentEvents: function(ev) {
            //if the rott si menu is open, spawn the browser context menu. if not open the root si menu
            document.oncontextmenu = function (e) {
                let element = document.getElementById('si_edit_main_menu');
                let v = element.currentStyle ? element.currentStyle.display : getComputedStyle(element, null).display;
                if (v != 'none') {
                } else {
                    let mm = document.getElementById('si_edit_main_menu');
                    mm.style.top = e.pageY + 'px';//e.clientY + "px";
                    mm.style.left = e.pageX + 'px';//e.clientX + "px";
                    mm.style.display = 'block';
                    e.preventDefault();
                    return false;
                }
             };

            window.onbeforeunload = function (ev) {
                ev.preventDefault();
                let list = '';
                let blocks = SI.Editor.Data.Objects.Blocks;
                for (let block in blocks) {
                    if (blocks.hasOwnProperty(block)) {
                        if (blocks[block].IsDirty) {
                          //  debugger;
                            list += block+ ", ";
                        }
                    }
                }
                if (list != '') {
                    //To google. I really wish this worked.
                    return ev.returnValue = 'There are unsaved changes in blocks: ' + list + '. Leave now?';
                   // return 'There are unsaved changes in blocks: ' + list + '. Leave now?';
                }             
            };

            let map = {}; //  so-5203407
            onkeydown = onkeyup = function (e) {
                let selected = SI.Editor.Objects.Elements.Selected;
                let isFocused = (document.activeElement === selected);      //so-36430561
                let movable = true;
                if (selected) {
                    //we only move by arrows if we have a position and the doc does not have a selected element so the arroews dont break textbox navigation
                    if (typeof selected.style.position === 'undefined' || selected.style.position === 'static' || isFocused) {
                        movable = false;
                    }
                }

                e = e || event; // to deal with IE
                map[e.keyCode] = e.type == 'keydown';
                let inc = (e.ctrlKey) ? 1 : 5;

                if (map[37]) { //Left Arrow
                    if (movable)
                    SI.Editor.Objects.Elements.MoveBy(-inc, 0);
                } 
                if (map[38]) {//Up Arrow
                    if (movable)
                    SI.Editor.Objects.Elements.MoveBy(0,-inc);
                }
                if (map[39]) {//Right Arrow
                    if (movable)
                    SI.Editor.Objects.Elements.MoveBy(inc, 0);
                }
                if (map[40]) {//Down Arrow
                    if (movable)
                    SI.Editor.Objects.Elements.MoveBy(0,inc);
                }
                if (map[46]) {//Delete Key
                    if (confirm("Delete Element: " + selected.id + "?")) {
                        SI.Editor.Objects.Elements.Remove(selected);
                    } else {
                        map[e.keyCode] = false;
                    }
                    delete map[46]; 
                }
                if (map[90] && e.ctrlKey) { //ctrl-z should undo
                    document.execCommand('undo');
                }
                //alert(e.keyCode);
            }
        },
        DrawAppContainer: function () {
            //create the container that all visible editor.js items will be containd in.
            let editorContainer = Ele('div', {
                class: 'lgn-editor',
                id: 'si_edit_container',
                style: {
                    fontFamily: SI.Editor.Style.FontFace,
                    color:SI.Editor.Style.TextColor,
                },
                appendTo:document.body,
            });
            SI.Editor.UI.Container = editorContainer;  
        },
        MainMenu: {
            Element: null,
            Init: function () {
                //Main Menu Box	
                var mainMenu = Ele('div', {
                    id: 'si_edit_main_menu',
                    class: 'si-window-container',//hack to make this play like a window
                    draggable: true,
                    style: {
                        width: '75px',
                        color: SI.Editor.Style.TextColor,
                        position: 'absolute',
                        display: 'none',
                        zIndex: '995',
                        left: '100px',
                    },
                    onmouseenter: function () {
                        var winds = document.getElementsByClassName("si-window-container");
                        for (let i = 0; i < winds.length; i++) {
                            winds[i].style.zIndex = '980';
                        }
                        this.style.zIndex = '981';
                    },
                    onmouseleave: function () {
                        //debugger;
                        SI.Editor.UI.MainMenu.IsDragging = false;
                        let hud = document.getElementById('si_edit_hud_editisdragging');
                        if(hud){
                            hud.innerHTML = SI.Editor.UI.MainMenu.IsDragging;
                        }
                    },
                    ondragstart: function (e) {
                        //Need to add the mouse to menu offset so that it can be determined below.
                        //debugger;
                        if (e.target.id.split('_')[0] == "dragger") { return; }
                        this.dataset.mOffX = e.offsetX;
                        this.dataset.mOffY = e.offsetY;
                        SI.Editor.UI.MainMenu.IsDragging = true;
                        e.dataTransfer.setData("Text", e.target.id);
                        let hud = document.getElementById('si_edit_hud_editisdragging');
                        if(hud){
                            hud.innerHTML = SI.Editor.UI.MainMenu.IsDragging;
                        }
                    },
                    ondragover: function (e) { e.preventDefault(); },
                    ondragend: function (e) {
                        //debugger;
                        SI.Editor.UI.MainMenu.IsDragging = false;
                        //get mouse offsets when the menu was clicked. this way it does not snap to the upper right on drop.
                        let moX = this.dataset.mOffX;
                        let moY = this.dataset.mOffY;
                        //change the menu position to be the mouse minus the original mouse offset
                        this.style.left = e.pageX - moX + 'px';
                        this.style.top = e.pageY - moY + 'px';
                        let hud = document.getElementById('si_edit_hud_editisdragging');
                        if(hud){
                            hud.innerHTML = SI.Editor.UI.MainMenu.IsDragging;
                        }
                        //console.log(e);
                    }
                });
                //Menu Items Table
                var mainMenuTable = Ele('table', {
                    id: 'si_edit_main_menu_table',
                    style: {
                        width: '100%',
                        borderCollapse: 'separate',      
                        borderSpacing: '0px',
                    }
                });
                //Menu Items 
                let mainMenuItems = ['add', 'edit', 'tools'];
                //debugger;
                for (let mi in mainMenuItems) {
                    let val = mainMenuItems[mi];
                    let brdrad = '0px';
                    let bdrcol = 'black black ' + SI.Editor.Style.BackgroundColor + ' black' ;
                    switch (val) {
                        case 'add': brdrad = '5px 5px 0px 0px'; break;
                        case 'tools': brdrad = '0px 0px 0px 5px'; break;
                    }
                    var mainMenuRow = Ele('tr', {});
                    let txt = val.toLowerCase().replace(/\b[a-z]/g, function (letter) {
                        return letter.toUpperCase();
                    });
                    let menuitem = Ele('td', {
                        innerHTML: txt,
                        id: 'si_' + val + '_menu_item',
                        style: {
                            cursor : 'pointer',                  
                            borderTopWidth : '0px',
                            borderLeftWidth : '0px',
                            textAlign: 'center',
                            backgroundColor: SI.Editor.Style.BackgroundColor,
                            borderRadius: brdrad,
                            border: '1px black solid',
                            borderColor: bdrcol,
                        },
                        onclick: function (e) { SI.Editor.UI.MainMenu.SelectMenu('si_edit_' + val + '_menuitem') },
                        appendTo: mainMenuRow,
                    });
                    if (val === 'tools') {
                        menuitem.style.borderBottom = '1px black solid';
                    }
                    mainMenuTable.appendChild(mainMenuRow);
                }
                //Append Main Menu at the end
                mainMenu.appendChild(mainMenuTable);
                //Close Editor x button	
                mainMenu.appendChild(Ele('button', {
                    id: 'close-editor',
                    innerHTML: 'X',
                    style: {
                        width: '26px',
                        height: '20px',
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        color: SI.Editor.Style.TextColor,
                        position: 'relative',
                        top: '-1px',
                        float: 'right',
                        fontSize: '12px',
                        border: '1px black solid',
                        borderRadius: '0px 0px 5px 5px',
                    },
                    onclick: function () { SI.Editor.Style.SetTheme(); mainMenu.style.display = 'none'; },
                }));
                SI.Editor.UI.Container.appendChild(mainMenu);
                SI.Editor.UI.MainMenu.Element = document.getElementById('si_edit_main_menu');
            }, 
            //Hide/Unhide sub menus when item selected
            SelectMenu: function(menu) {
                //for now we want something selected before openeing the edit menu
                if (menu == "si_edit_edit_menuitem" && SI.Editor.Objects.Elements.Selected == null) {
                    alert("Please select an element to edit.");
                    return false;
                }
                if (menu && SI.Tools.Is.Visible(menu)) {
                    SI.Tools.Style.FadeOut(menu, 200);
                }
                else {
                    let menus = ["si_edit_add_menuitem", "si_edit_edit_menuitem", "si_edit_tools_menuitem"];
                    menus.forEach(function (_menu) {
                        if (menu === _menu) {
                            SI.Tools.Style.FadeIn(_menu, 200);
                        } else {
                            if (_menu && SI.Tools.Is.Visible(_menu)) {
                                SI.Tools.Style.FadeOut(_menu, 200);
                            }
                        }
                    });
                }
            },
            IsDragging:false,
        },
        AddPanel: {
            Init: function () {
                var htmlattrs = JSON.parse(localStorage.getItem("html_attributes"));
                //Add Menu		
                var tagMenu = Ele('div', {
                    id: 'si_edit_add_menuitem',
                    style: {
                        width: '200px',
                        height : '220px',
                        backgroundColor : SI.Editor.Style.BackgroundColor,
                        position : 'absolute',
                        top : '0px',
                        left : '75px',
                        display : 'none',
                        padding : '0',
                        fontSize: '.8em',
                    },
                    onscroll: function (e) {
                       e.stopPropagation();
                    },
                });
                SI.Editor.UI.AddPanel.SetupTabs(tagMenu);
                //Append the new menu to the main menu.
                SI.Editor.UI.MainMenu.Element.appendChild(tagMenu);
            },
            SetupTabs: function (newMenu) {
                let tabs = new SI.Widget.Tab({Id:"si_edit_add_tab"});
                //create the tabbox
                let tabTags = Ele('div', {
                    id: 'si_edit_add_tag',
                    style:{
                        width : "96%",
                        height : "200px",
                        backgroundColor : "black",
                        paddingLeft: '5px',
                        overflow : 'auto',
                    }
                });
                //tags.appendChild(tabTags);
                let tagscroll = SI.Editor.UI.AddPanel.TagScroller();
                tabTags.appendChild(tagscroll);
                
                var tabWidgets = Ele('div', {
                    id: 'si_edit_add_widget',
                    style: {
                        width: "96%",
                        height: "200px",
                        backgroundColor: "black",
                        paddingLeft: '5px',
                        overflow: 'auto',
                    }
                });
                
                var widgetbox = SI.Editor.UI.AddPanel.Widgetbox();
                tabWidgets.appendChild(widgetbox);

                tabs.Items.Add("Tags", tabTags);
                tabs.Items.Add("Widgets", tabWidgets);

                newMenu.appendChild(tabs.Draw());
            },
            Widgetbox: function () {
                //The container holds all
                let widgetscontainer = Ele('div', {
                    style: {
                        width: '100%',
                        height:'100%',
                    },
                });
                //The table makes it easy to add widgets in a column
                let widgettable = Ele('table', {
                    style: { backgroundColor: SI.Editor.Style.BackgroundColor, width: '100%' }
                });
                //For each individual widget, add a instance.
                let widgets = SI.Widget;
                for (let widget in widgets) {
                    let widgetrow = document.createElement('tr');
                    let tddragger = document.createElement('td');
                    var widgetDragger = Ele('div', {
                        id: "si_edit_widgetdragger" + widget,
                        style: {
                            backgroundImage: "url('/editor/media/icons/widgets.png')",
                            backgroundSize: "cover",
                            width: '24px',
                            height: '24px'
                        },
                        data: {
                            type: widget,
                        },
                        draggable: true,
                        ondragstart: function (ev) {
                            //  this.dragging = true;
                            ev.effectAllowed = "copyMove";
                            ev.dataTransfer.setData("Text", widget);
                        },
                        ondrag: function (ev) {
                            SI.Editor.UI.MainMenu.IsDragging = false;
                            //console.log(e);
                            if (ev.buttons === 3) { //both buttons down
                                ev.preventDefault();
                                return false;
                            }

                        },
                        ondragtransfer: function (ev) {
                            ev.dataTransfer.dropEffect = "copy";
                        },
                        ondragend: function (e) {
                            e.stopPropagation();
                            //debugger;
                            if (SI.Tools.Is.Element(SI.Editor.Objects.Elements.DropParent)) {
                                let widget = e.target.dataset.type;
                                let parent = SI.Editor.Objects.Elements.DropParent;
                                let options = { "Parent": parent, "Top": e.clientY + "px", "Left": e.clientX+'px' }
                                let block = SI.Tools.Element.GetBlock(parent).id.replace("si_block_", "");
                                if (block) {
                                    //debugger;
                                    SI.Editor.Objects.Widgets.AddInstance(block, widget, options);
                                    SI.Editor.Data.Objects.Blocks[block].IsDirty = true;
                                }
                            }
                            else {
                                alert("Please make sure you drop on a block. Go to the Page tool to make blocks");
                            }
                        }
                    });
                    tddragger.appendChild(widgetDragger);
                    var tddata = document.createElement('td');
                    tddata.innerHTML = widget;
                    widgetrow.appendChild(tddragger);
                    widgetrow.appendChild(tddata);
                    widgettable.appendChild(widgetrow);
                }
                widgetscontainer.appendChild(widgettable);
                return widgetscontainer;
            },
            TagScroller: function() {
                var tagsview = Ele('div', {
                    ondrop: function (e) {
                        //alert();
                        e.stopPropagation();
                        e.preventDefault();
                        return false;
                    }
                });
                
                for (let group in SI.Editor.Data.html_elements) {
                    if (SI.Editor.Data.html_elements.hasOwnProperty(group)) {
                        let tagbox = Ele('div', { innerHTML : group });
                        let tagtable = Ele('table', {
                            style:{backgroundColor: SI.Editor.Style.BackgroundColor, width:'100%'}
                        });
                        //debugger;
                        let tagGroup = SI.Editor.Data.html_elements[group]; 

                        for (let prop in tagGroup) {
                            if (tagGroup.hasOwnProperty(prop)) {
                               
                                var ele = tagGroup[prop].n;
                                var tg = tagGroup[prop].t;


                                if (tagGroup[prop].def) {
                                    var def = JSON.stringify(tagGroup[prop].def);
                                } else {
                                    def = false;
                                }
                                
                                var tagsrow = document.createElement('tr'); 
                                var tddragger = document.createElement('td');

                                var imDragger = Ele('div', {
                                    id: "dragger_" + ele,
                                    style: {
                                        backgroundImage : "url('/editor/media/icons/dragaround.png')",
                                        backgroundSize : "cover",
                                        width : '24px',
                                        height : '24px'
                                    },
                                    data: {
                                        default:def,
                                    },
                                    draggable: true,
                                    ondragstart : function (ev) {
                                      //  this.dragging = true;

                                        ev.effectAllowed = "copyMove";
                                        ev.dataTransfer.setData("Text", ele);
                                    },
                                    ondrag: function (e) {
                                        SI.Editor.UI.MainMenu.IsDragging = false;
                                        //console.log(e);
                                        if (e.buttons === 3) { //both buttons down
                                            e.preventDefault();
                                            return false;
                                        }

                                    },
                                    ondragtransfer: function (ev) {
                                        ev.dataTransfer.dropEffect = "copy";
                                    },
                                    ondragend: function (e) {

                                        e.stopPropagation();
                                        //debugger;
                                        if (SI.Tools.Is.Element(SI.Editor.Objects.Elements.DropParent) ) {
                                            //debugger;
                                            var tag = e.target.id.split('_')[1].trim();
                                            var isempty = SI.Tools.Is.EmptyElement(tag);
                                            var isinline =SI.Tools.Is.EmptyElement(tag);
                                            let def = null;
                                            // console.log('isEmpty:' + isempty);
                                            if (e.target.dataset.default) {
                                                def = JSON.parse(e.target.dataset.default);
                                            }
                                            // var obj = document.createElement(tag);
                                            //debugger;
                                            var obj = Ele(tag, def);
                                            

                                            if (!isempty && obj.innerHTML.length === 0 ) {
                                                obj.innerHTML = tag;
                                            }

                                            if (tag == "script") {
                                                obj.innerHTML = "console.log('Your script starts here')";
                                            }
                                            obj.style.position = 'absolute';
                                            //obj.style.position = 'relative';
                                            obj = SI.Editor.Objects.Elements.Editable(obj);
                                            //debugger;
                                            if (SI.Editor.Objects.Elements.DropParent != null) {
                                                if (typeof SI.Editor.Objects.Elements.DropParent.id != "undefined" && SI.Editor.Objects.Elements.DropParent.id.startsWith('si_block_')){
                                                    obj.style.top = e.pageY - parseInt(SI.Editor.Objects.Elements.DropParent.offsetTop) + "px";
                                                    obj.style.left = e.pageX - parseInt(SI.Editor.Objects.Elements.DropParent.offsetLeft) + "px";
                                                   // var b = new EditBox(obj);
                                                    
                                                    SI.Editor.Objects.Elements.DropParent.appendChild(obj);
                                                }
                                                else {
                                                    var ot =SI.Tools.GetElementOffset(SI.Editor.Objects.Elements.DropParent, 'offsetTop');
                                                    var ol =SI.Tools.GetElementOffset(SI.Editor.Objects.Elements.DropParent, 'offsetLeft');
                                                    obj.style.top = e.pageY - ot + "px";
                                                    obj.style.left = e.pageX - ol+ "px";
                                                    //var b = new EditBox(obj);
                                                    SI.Editor.Objects.Elements.DropParent.appendChild(obj);
                                                }
                                            }
                                            //make block dirty so that we can tell the user to save it before leaving
                                            let block =SI.Tools.Element.GetBlock(obj).id.replace("si_block_", "");
                                            if (block) {
                                                SI.Editor.Data.Objects.Blocks[block].IsDirty = true;
                                            }
                                            
                                        }
                                        else
                                        {
                                            alert("Please make sure you drop on a block. Go to the Page tool to make blocks");
                                        }
                                    }
                                });
                                
                                tddragger.appendChild(imDragger);
                                var tddata = document.createElement('td');
                                tddata.innerHTML = tagGroup[prop].ln;

                                tagsrow.appendChild(tddragger);
                                tagsrow.appendChild(tddata);

                                SI.Editor.Objects.Settings.Help.Show("tags", tagGroup[prop], tagsrow);

                                tagtable.appendChild(tagsrow);
                            }
                        }
                        tagbox.appendChild(tagtable);
                        tagsview.appendChild(tagbox);
                    }
                }
                Ele("div", { style: { height: '16px', position: 'relative' }, appendTo: tagsview });//hack to fix the bottom row of the scrolls. This is probably a tabs issue. further investigate.
                return tagsview;
            },
        },
        EditPanel: {
            //Init: build the panel, setup and populate the tabs.
            Init: function () {
                var editMenu = Ele('div', {
                    id: 'si_edit_edit_menuitem',
                    style: {
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        position: 'absolute',
                        top: '20px',
                        left: '75px',
                        display: 'none',
                        width: '485px',
                        height: '329px',
                    },
                    draggable: true,
                    ondragover: function (e) { e.preventDefault();},
                    ondragstart: function (e) {
                        
                        e.stopPropagation();
                        return false;
                    },

                });
                var tabs = new SI.Widget.Tab({Id:'si_edit_edit_tab' });
                tabs.Items.Add('Main', SI.Editor.UI.EditPanel.DrawMain());
                tabs.Items.Add('Attributes', SI.Editor.UI.EditPanel.DrawAttributes());
                tabs.Items.Add('Styles', SI.Editor.UI.EditPanel.DrawStyles());
               // tabs.Items.Add('Styles2', SI.Editor.UI.EditPanel.DrawStyles2());
                editMenu.appendChild(tabs.Draw());
                SI.Editor.UI.MainMenu.Element.appendChild(editMenu);
            },
            //Draw the Main tab 
            DrawMain: function (e) {
                //Container
                let container = Ele('div', {
                    id: 'si_main_view',
                    style: {
                        height: '329px',
                        backgroundColor: 'black',
                        color: SI.Editor.Style.TextColor,
                        padding: '15px',
                        overflowY: 'scroll',
                    },
                    ondrag: function () {
                        return false;
                    },
                });
                SI.Tools.StopOverscroll(container);
                //Menubox
                let menu = Ele('div', {
                    id: "si_edit_main_menubox",
                    style: {
                        position: 'relative',
                    },
                    appendTo: container,
                });
                //Select Button
                let select = Ele('button', {
                    innerHTML: "Select",
                    onclick: function (e) {
                        let panel = document.getElementById("si_edit_main_selectpanel");
                        handlePanels(panel);
                        refreshSelects();
                    },
                    style: {
                       
                    },
                    appendTo: menu,
                });

                let selectpanel = Ele('div', {
                    id: "si_edit_main_selectpanel",
                    class:"si-edit-main-panel",
                    style: {
                        backgroundColor: 'silver',
                        display: 'none',
                        position: 'absolute',
                        marginLeft: '0px',
                        padding: '3px',
                        color:'black',
                    },
                    appendTo: menu,
                });

                let blkBtn = Ele('button', {
                    innerHTML: "Block",
                    onclick: function (e) {
                        //debugger;
                        let sel = SI.Editor.Objects.Elements.Selected
                        let blk =SI.Tools.Element.GetBlock(sel);

                        SI.Editor.Objects.Blocks.Select(blk.id);
                    },
                    style: {
                        display: 'block',
                        width: '74px',
                    },
                    appendTo: selectpanel,
                });

                
                let parBtn = Ele('button', {
                    innerHTML: "Parent",
                    onclick: function (e) {
                        let sel = SI.Editor.Objects.Elements.Selected;
                        if (sel) {
                            let par = sel.parentElement;
                            if (par.classList.contains('si-block')) {
                                // do some stuff
                                alert("Can't select parent block");
                                return;
                            }
                            if (par.id != null) {
                                SI.Editor.Objects.Elements.Select(e,par.id);
                            }
                        }
                    },
                    style: {
                        display: 'block',
                        width: '74px',
                    },
                    appendTo: selectpanel,
                });

                Ele('span', { innerHTML: "By id", appendTo: selectpanel});
                let selectbyid = Ele('select', {
                    style: {
                        width: "30px",
                        marginLeft:"10px"
                        
                    },
                    onmouseenter: function (e) { refreshSelects(); },
                    onchange: function (e) {                      
                        let ele = document.getElementById(this.value)
                        if (ele) {
                            var event = new MouseEvent('dblclick', {
                                'view': window,
                                'bubbles': false,
                                'cancelable': true
                            });
                            ele.dispatchEvent(event);
                            refreshSelects();
                        }                     
                    },
                    appendTo: selectpanel,
                    
                });
                let handlePanels = function (panel) {
                    //determine if we are showing or hiding the panel
                    let display = 'none';
                    if (panel.style.display == 'block') {
                        display = 'none';
                    } else {
                        display = 'block';
                    }
                    //make sure ALL of the panels are hidden
                    let panels = document.getElementsByClassName('si-edit-main-panel');
                    for (let p in panels) {
                        if (panels.hasOwnProperty(p)) {
                            panels[p].style.display = 'none';
                        }
                    }
                    //set the given panel to be 
                    panel.style.display = display;
                }
                let refreshSelects = function () {
                    //debugger;
                    //capture the display of the element 
                    let startValue = selectbyid.value;
                    //clear the select element
                    selectbyid.innerHTML = "";
                    //get all the blocks
                    let blocks = document.querySelectorAll(".si-block");
                    let selid = null;
                    if (SI.Editor.Objects.Elements.Selected) {
                        selid = SI.Editor.Objects.Elements.Selected.id;
                    }
                    //debugger;
                    for (let block of blocks) {

                        let group = Ele('optgroup', {
                            label: block.id.replace("si_block_", ""),
                            style: {
                                color: 'darkgrey',
                            },
                        })
                        selectbyid.add(group);

                        let option = Ele('option', {
                            innerHTML: block.id,
                            value: block.id,
                            disabled: true,
                            style: {
                                color: 'navy',
                            },
                        })
                        selectbyid.add(option);
                           
                        let children = document.querySelectorAll("#" + block.id + " *");
                        for (let child of children) {
                            let color = 'blue';
                            let disabled = false;
                            if (child.id == selid) {
                                color = 'red';
                                option.disabled = "disabled";
                                disabled = true;
                            }
                                    
                            let generations = SI.Tools.Element.GenerationsFromBlock(child);
                            let tab = '';
                            for (let g = 0; g < generations; g++) {
                                tab += "&nbsp;&nbsp;&nbsp;&nbsp;";
                            }
                            let ele = Ele('option', {
                                innerHTML: tab + child.id,
                                value: child.id,
                                style: {
                                    color: color,
                                },
                            })
                            if (disabled) {
                                ele.disabled = "disabled";
                            }
                            selectbyid.add(ele);
                        }
                    }
                    selectbyid.value = startValue;
                }

                //Parent Button
                let parent = Ele('button', {
                    innerHTML: "Parent",
                    onclick: function (e) {
                        let panel = document.getElementById("si_edit_main_parentpanel");
                        handlePanels(panel);
                        refreshParents();
                    },
                    style: {
                        marginLeft: '5px',
                    },
                    appendTo: menu,
                });
                let parentpanel = Ele('div', {
                    id: "si_edit_main_parentpanel",
                    class: "si-edit-main-panel",
                    style: {
                        backgroundColor: 'silver',
                        display: 'none',

                        position: 'absolute',
                        marginLeft: '58px',
                        padding: '3px',
                    },
                    appendTo: menu,
                });
                let selectedParentLabel = Ele('span', {
                    innerHTML: "Parent:",
                    style: {
                        color: 'black',
                        display: 'block',
                    },
                    appendTo: parentpanel,
                });
                let selectedParentValue = Ele('span', {
                    innerHTML: "NothingSelected",
                    style: {
                        color: 'blue',
                        display: 'block',
                    },
                    appendTo: parentpanel,
                });
                Ele('hr', { appendTo: parentpanel,});
                let changeParentLabel = Ele('span', {
                    innerHTML: "Change Parent",
                    style: {
                        color: 'black',
                        display:'block',
                    },
                    appendTo: parentpanel,
                });

                let selectBlockElements = Ele('select', {
                    onchange: function (e) {
                        if (SI.Editor.Objects.Elements.Selected != null) {
                            let newParent = document.getElementById(this.value);
                            if (newParent != SI.Editor.Objects.Elements.Selected.parentElement) {
                                newParent.appendChild(SI.Editor.Objects.Elements.Selected);
                            } else {
                                console.log("The element alread belongs to that parent");
                            }
                            
                        }
                    },
                    onmouseenter: function () { refreshParents(); },
                    appendTo: parentpanel,
                });
                let refreshParents = function () {
                    //first get all the blocks
                    let startValue = selectBlockElements.value;
                    selectBlockElements.innerHTML = "";
                    let blocks = document.querySelectorAll(".si-block");
                    let selid = null;
                    if (SI.Editor.Objects.Elements.Selected) {
                        selid = SI.Editor.Objects.Elements.Selected.id;
                        selectedParentValue.innerHTML = SI.Editor.Objects.Elements.Selected.parentElement.id;
                    }
                    //debugger;
                    for (let b in blocks) {
                        if (blocks.hasOwnProperty(b)){
                            //add the options group showing the block name
                            let group = Ele('optgroup', {
                                label: blocks[b].id.replace("si_block_", ""),
                                style: {
                                    color: 'darkgrey',
                                },
                            })
                            selectBlockElements.add(group);

                            let block = Ele('option', {
                                innerHTML: blocks[b].id,
                                value: blocks[b].id,
                                style: {
                                    color: 'navy',
                                },
                            })
                            selectBlockElements.add(block);
                            //debugger;
                            children = document.querySelectorAll("#" + blocks[b].id + " *");
                            for (let c in children) {
                                if (children.hasOwnProperty(c)) {
                                    if (!SI.Tools.Is.EmptyElement(children[c].tagName)) {
                                        let color = 'blue';
                                        let disabled = false;
                                        if (children[c].id == selid) {
                                            color = 'red';
                                            block.disabled = "disabled";
                                            disabled = true;
                                        }
                                        //debugger;
                                        let generations =SI.Tools.Element.GenerationsFromBlock(children[c]);
                                        let tab = '';
                                        for (let g = 0; g < generations; g++) {
                                            tab += "&nbsp;&nbsp;&nbsp;&nbsp;";
                                        }
                                        let ele = Ele('option', {
                                            innerHTML: tab+children[c].id,
                                            value: children[c].id,
                                            style: {
                                                color: color,
                                            },
                                        })
                                        if (disabled) {
                                            ele.disabled = "disabled";
                                        }
                                        selectBlockElements.add(ele);
                                    }
                                }
                            }
                        }
                    }
                    selectBlockElements.value = startValue;
                }

                //Delete Button
                let remove = Ele('button', {
                    innerHTML: "Delete",
                    onclick: function (e) {
                        if (confirm("Delete Element " + SI.Editor.Objects.Elements.Selected.id+"???")) {
                            SI.Editor.Objects.Elements.Remove(SI.Editor.Objects.Elements.Selected);
                        } 
                    },
                    style: {
                        marginLeft: '5px',
                    },
                    appendTo: menu,
                });

                //Advanced Button
                let advanced = Ele('button', {
                    innerHTML: "Advanced",
                    onclick: function (e) {
                        let panel = document.getElementById("si_edit_main_advancedpanel");
                        handlePanels(panel);

                    },
                    style: {
                        marginLeft: '5px',
                    },
                    appendTo: menu,
                });
                let advancedpanel = Ele('div', {
                    id: "si_edit_main_advancedpanel",
                    class: "si-edit-main-panel",
                    style: {
                        backgroundColor: 'silver',
                        display: 'none',
                        position: 'absolute',
                        marginLeft: '178px',
                        padding: '7px',
                        color: 'black',
                    },
                    appendTo: menu,
                });
                let multilinguallbl = Ele('span', {
                    innerHTML: 'Multilingual ',
                    title: "translate the text into other languages",
                    style: {
                        fontSize: '.6em',
                    },    
                    appendTo: advancedpanel,
                });
                //MULTILINGUAL SELECT
                let mylang = SI.Editor.Data.User.Languages;
                let multilingualselect = Ele('select', {
                    id:'si_edit_main_advanced_mlselect',
                    append: Ele('option', {}),
                    onchange: function (ev) {
                        //debugger;
                        if (this.selectedIndex) {

                            if (confirm("This will replace the innerHTML of this element with the contents of the multilingual text!\nThiscan't be undone. The current innerHTML will be foever lost")) {
                                //debugger;
                                let index = this.selectedIndex - 1;
                                    let localtext = SI.Editor.Objects.Language.Current[index];
                                    //let opt = this.options[this.selectedIndex];
                                    for (let lang of mylang) {
                                        let col = '_' + lang.toLowerCase();
                                        if (localtext[col] && localtext[col].length > 0) {
                                            let text = localtext[col];
                                            SI.Editor.Objects.Elements.Selected.innerHTML = text;
                                            SI.Editor.Objects.Elements.Selected.classList.add("si-multilingual-" + localtext.name);
                                            SI.Editor.Objects.Elements.Selected.classList.add("si-multilingual");
                                            SI.Editor.Objects.Elements.Selected.dataset.si_ml_index = index;
                                            SI.Editor.Objects.Elements.Selected.dataset.si_ml_token = localtext.name;
                                            break;
                                        }
                                    }
                            } else {
                                this.selectedIndex = 0;
                            }
                        } else {
                            if (SI.Editor.Objects.Elements.Selected.classList.contains("si-multilingual-")) {
                                if (confirm("This will remove the multilingual nature of this element.\nThe innerHTML will remain intact but will not be tracked multilingually.\nThis will not affect the item in the Language tool or other elements it is assigned to.")) {
                                    var classes = SI.Editor.Objects.Elements.Selected.classList;
                                    

                                    SI.Editor.Objects.Elements.Selected.classList.Remove("si-multilingual");
                                    SI.Editor.Objects.Elements.Selected.removeAttribute('data-si_ml_index');
                                    SI.Editor.Objects.Elements.Selected.removeAttribute('data-si_ml_token');
                                }
                            }
                        }
                    },
                    appendTo: advancedpanel,
                });
                let current = SI.Editor.Data.Objects.Language.Current;
               
                //debugger;
                
                for (let texts of current) {
                    //debugger;
                    for (let lang of mylang) {
                        let col = '_' + lang.toLowerCase();
                        if (texts[col] && texts[col].length > 0) {
                            let text = texts[col]
                            if (texts[col].length > 32) {
                                text = texts[col].substr(0, 32) + "\u2026";
                            }
                            
                            Ele('option', {
                                innerHTML: text,
                                data: {
                                    id: '0x' + texts.id,
                                    token: texts.name,
                                    column: col,
                                },
                                appendTo: multilingualselect,
                            })
                            break;
                        }
                    }


                }


                Ele("br", { appendTo: advancedpanel});
                let ignoreInnerlbl = Ele('span', {
                    innerHTML: 'Ignore innerHTML on Save ',
                    title:"This is useful when personal data may be present in an element and should not be saved to the block database. eg: Logged In: MyUserName",
                    style: {
                        fontSize:'.6em',
                    },
                    appendTo: advancedpanel,
                });
                let ignoreInner = Ele('input', {
                    type: 'checkbox',
                    id: "si_edit_main_advanced_ignoreinner",
                    onchange: function (ev) {
                        //debugger;
                        if (this.checked) {
                            SI.Editor.Objects.Elements.Selected.classList.add("si-editable-ignoreinner");
                        } else {
                            SI.Editor.Objects.Elements.Selected.classList.remove("si-editable-ignoreinner");
                        }
                    },
                    appendTo: advancedpanel,
                });


                let maintable = Ele("table", {
                    id: "si_edit_main_shotrcuttable",
                    style: {
                        height: '100%',
                        paddingBottom: '40px',
                    },
                    appendTo: container,
                });

                //soon to be user selectable shortcuts to often used tools.       
                SI.Editor.UI.EditPanel.DrawQuickMenuItems(maintable);
                return container
            },
            DrawQuickMenuItems: function(maintable) {
                maintable.innerHTML = "";
                let sc = SI.Editor.Data.User.QuickMenuItems;
                for (let i in sc) {
                    if (sc.hasOwnProperty(i)) {
                        let control = sc[i];
                        let type = control.Type;
                        let row = SI.Editor.Objects.Elements[type].Widget(control);
                        if (row != null) {
                            maintable.appendChild(row);
                        }
                    }
                }
            },
            //Draw the attributes tab
            DrawAttributes: function (e) {
                var attrsview = Ele('div', {
                    id: 'si_attribute_view',
                    style: {
                        height: '329px',
                        overflowY: 'scroll',
                    },
                    
                });
                //Tools.StopOverscroll(attrsview); //this is meant to make the screen not scroll past the window. it needs work
                var pretable = Ele('table', {
                    style: {
                        width: '100%',  
                    }
                });
                var fnamerow = document.createElement('tr');
                var fnameLabel = document.createElement('td');
                fnameLabel.innerHTML = 'friendly name';
                fnamerow.appendChild(fnameLabel);
                var fnameLabel = document.createElement('td');
                fnameLabel.innerHTML = '<input />';
                fnamerow.appendChild(fnameLabel);

                for (let group in SI.Editor.Data.html_attributes) {
                    //           console.log(eletype + "  " + prop);
                    if (SI.Editor.Data.html_attributes.hasOwnProperty(group)) {

                        var attrsbox = Ele('div', {
                            innerHTML: group,
                            style: {
                                backgroundColor: 'black',
                                color: SI.Editor.Style.TextColor,
                                paddingLeft: '10px',
                            },
                        });         
                        if (group != 'GLOBAL' && group != 'EVENT') {
                            attrsbox.classList.add('si-attribute-group');
                            attrsbox.id = 'si_attribute_group_' + group.trim();
                            attrsbox.style.display = 'none';
                        }
                        var attrstable = Ele('table', {
                            style: {
                                width: '100%',
                                borderCollapse: 'collapse',
                                userSelect: false,
                                backgroundColor: SI.Editor.Style.BackgroundColor,
                            }
                        });
                        for (let attribute in SI.Editor.Data.html_attributes[group]) {
                            if (SI.Editor.Data.html_attributes[group].hasOwnProperty(attribute)) {
                                let editableAttributeRow = SI.Editor.Objects.Elements.Attributes.Widget({ "Group": group, "Index": attribute });
                                if (editableAttributeRow != null) {
                                    attrstable.appendChild(editableAttributeRow);                                 
                                }
                            }
                        }

                        Ele("tr", { append: Ele('td', { innerHTML: '|' }), appendTo: attrstable });//hack to fix the bottom row of the scrolls. This is probably a tabs issue. further investigate.
                        
                        attrsbox.appendChild(attrstable);
                        attrsview.appendChild(attrsbox);
                        
                    }
                }
                return attrsview;

            },
            //Draw the styles tab
            DrawStyles : function (e) {

                var styleview = Ele('div', {
                    id: 'si_style_view',
                    style: {
                        height: '329px',
                        overflowX: 'hidden',
                        overflowY: 'scroll',
                    },
                });
                
               // var eletype = ele.tagName.toLowerCase();
                //Loop through all of the groups of styles
                for (let group in SI.Editor.Data.css_properties) {
                    if (SI.Editor.Data.css_properties.hasOwnProperty(group)) {
                        if (!group.startsWith("Pseudo") && group!=="At Selectors" ) {
                            //Make the group box
                            let stylebox = Ele('div', {
                                innerHTML: group,
                                style: {
                                    backgroundColor: 'black',
                                    color: SI.Editor.Style.TextColor,
                                    paddingLeft: "10px",
                                },
                                appendTo: styleview,
                            });
                            let styletable = Ele('table', {
                                style: {
                                    backgroundColor: SI.Editor.Style.BackgroundColor,
                                    color: SI.Editor.Style.TextColor,
                                    width: '100%',
                                },
                                appendTo: stylebox,
                            });
                            //Loop through all of the possible styles and create a user interface for them :)
                            for (let css in SI.Editor.Data.css_properties[group]) {
                                if (SI.Editor.Data.css_properties[group].hasOwnProperty(css)) {
                                    var editableChoiceRow = SI.Editor.Objects.Elements.Styles.Widget({ "Group": group, "Index": css });
                                    if (editableChoiceRow != null) {
                                        styletable.appendChild(editableChoiceRow);
                                    }
                                }
                            }
                        }
                    }
                }
                Ele("div",{style: {height:"18px",}, appendTo:styleview });//hack to fix the bottom of the scrolls. This is probably a tabs issue. further investigate.
                return styleview;
            },

            //When a element is selected, update ALL the Attributes and styles UIs to reflect the elements values.
            SetSelectedElementValues: function (element) {
                //debugger;
                //CONFIG the menu
                //In the attributes menu we have tag specific attributes. We only want to show the Global, Event, and Tag specific attributes.
                //first hide all attribute groups.
                //debugger;
                SI.Tools.Class.Loop("si-attribute-group", function (ag) {
                    ag.style.display = 'none';
                });
                //if the tags attribute list exists, show it
                //debugger;
                let tag = element.tagName.toLowerCase();
                let group = document.getElementById("si_attribute_group_" + tag);
                if (group != null) {
                    group.style.display = 'block';
                }
                //good thing all styles are global...

                //clear all the data from the attributes and style lists. 
                SI.Editor.UI.EditPanel.Clear.Attributes();
                SI.Editor.UI.EditPanel.Clear.Styles();
                //debugger;
                //Loop through all the element's attributes and styles and set what ever we can in the UI so we see what they have
                for (let i = 0; i < element.attributes.length; i++) {
                    var attrib = element.attributes[i];
                    if (attrib.specified) {
                       //if it is not a global attr then try to find it as it tag name
                        let fields = document.getElementsByClassName("si-edit-attribute-GLOBAL-" + attrib.name);
                        //if it is not a global attr then try to find it as it tag name
                        if (!fields) { 
                            fields = document.getElementsByClassName("si-edit-attribute-" + element.tagName.toLowerCase() + "-" + attrib.name);
                        }
                        if (fields) {
                            for (let field in fields) {
                                if (fields.hasOwnProperty(field)) {
                                    if (attrib.name.startsWith('data-')) {
                                        //add the elements styles here
                                    }
                                    //Handle showing the inline styles
                                    else if (attrib.name == 'style') {
                                    
                                        var parts = attrib.value.split(";");
                                        for (let j = 0; j < parts.length; j++) {
                                            let kvp = parts[j].split(':');
                                            if (kvp.length > 1) {
                                                //debugger;
                                                let sty = kvp[0];
                                                //    var inputs = document.querySelectorAll("." + "si-edit-style-" + sty);
                                                let inputs = document.getElementsByClassName("si-edit-style-" + kvp[0].trim());
                                                for (let k = 0; k < inputs.length; k++) {
                                                    inputs[k].value = kvp[1];
                                                }
                                            }
                                        }
                                    }
                                    else if (attrib.name == 'class') {
                                        fields[field].value = attrib.value.replace(/class="si-editable-element"/g, "").replace(/si-editable-element/g, "").replace("si-editor-selected", "");
                                    }
                                    else {
                                        fields[field].value = attrib.value;
                                    }
                                }
                            }
                        }
                    }
                }
                //since these are not technically attributes but I want to show them none the less. 
                let tagname = document.getElementsByClassName("si-edit-attribute-GLOBAL-tag");
                for (let i = 0; i < tagname.length; i++) {
                    tagname[i].value = tag;
                }
                let innerHtmls = document.getElementsByClassName("si-edit-attribute-GLOBAL-innerHTML");
                let innerTexts = document.getElementsByClassName("si-edit-attribute-GLOBAL-innerText");
                //debugger;
                if (!SI.Tools.Is.EmptyElement(tag)) {
                    //disable the ignore inner checkbox
                    document.getElementById('si_edit_main_advanced_ignoreinner').disabled = false;                  
                    if (element.classList.contains("si-editable-ignoreinner")) {
                        document.getElementById('si_edit_main_advanced_ignoreinner').checked = true;
                    } else {
                        document.getElementById('si_edit_main_advanced_ignoreinner').checked = false;
                    }
                    for (let i = 0; i < innerHtmls.length; i++) {
                        var html = element.innerHTML;
                        html = html.replace(/class='si-editable-element'/g, "").replace(/si-editable-element/g, "");
                        innerHtmls[i].disabled = false;
                        innerHtmls[i].value = html;
                    }                   
                    for (let i = 0; i < innerTexts.length; i++) {
                        var children = element.children;
                        for (let j = 0; j < children.length; j++) {
                            innerTexts[i].disabled = false;
                            var child = children[j];
                            if (child.nodeType != Node.TEXT_NODE) {
                                innerTexts[i].disabled = true;
                            }
                        }
                        innerTexts[i].value = element.innerText;
                    }
                } else {
                    document.getElementById('si_edit_main_advanced_ignoreinner').disabled = true;

                    for (let html of innerHtmls) {
                        html.value = "This type of element cannot accept inner text or child elements";
                        html.disabled = true;
                    }
                    for (let txt of innerTexts) {
                        txt.value = "This type of element cannot accept inner text";
                        txt.disabled = true;
                    }
                }

                //debugger;
                let mlsel = document.getElementById('si_edit_main_advanced_mlselect');
                if (element.classList.contains('si-multilingual')) {
                    let mlIn = parseInt(element.dataset.si_ml_index)+1;
                    mlsel.selectedIndex = mlIn;//  selectedIndex = mlIn + 1;//minus 1 for the first blank row
                    for (let i = 0; i < innerHtmls.length; i++) {
                        innerHtmls[i].disabled = true;
                        innerHtmls[i].title = "You will need to edit multilingual text from the language tool.";
                    }  
                } else {
                    for (let i = 0; i < innerHtmls.length; i++) {
                        innerHtmls[i].removeAttribute('disabled');
                        innerHtmls[i].removeAttribute('title');
                    }  
                    mlsel.selectedIndex =0;//
                }


                let stylefield = document.getElementsByClassName("si-edit-attribute-GLOBAL-style");
                for (let i = 0; i < stylefield.length; i++) {
                    stylefield[i].value = element.style.cssText;
                }
            },
            //Clears the Attributes or the Styles
            Clear: {
                Attributes: function () {
                    SI.Tools.Class.Loop("si-edit-attribute", function (ele) {
                        if (!ele.dataset.siPreserve) {
                            ele.value = "";
                        }
                    });
                },
                Styles: function () {
                   SI.Tools.Class.Loop("si-edit-style", function (ele) {
                       if (!ele.dataset.siPreserve) {
                           ele.value = "";
                       }
                    });
                },
            }
        },
        ToolsPanel: {
            ToolWindows: ["Page", "Media", "Site", "Styler", "Scripter", "Widgets", "Language", "Entities", "Plugins", "Security", "Users","Settings"],
            Init: function () {
                //Tools Menu	
                //Make a div for the tools panel
                var toolsMenu = Ele('div', {
                    id: 'si_edit_tools_menuitem',
                    style: {
                        backgroundColor : SI.Editor.Style.BackgroundColor,
                        position : 'absolute',
                        top : '45px',
                        left : '74px',
                        display : 'none',
                    }
                });

                //put a table in it so stuff stacks nice
                var toolsMenuTable = Ele('table', {
                    style: {
                        width: '100%',
                        borderCollapse : "collapse",
                    }
                });

                for (let i in SI.Editor.UI.ToolsPanel.ToolWindows) {
                 //   debugger;
                    let title = SI.Editor.UI.ToolsPanel.ToolWindows[i];

                    var menuRow = toolsMenuTable.insertRow(i);
                    var menuItem = menuRow.insertCell(0);
                    menuItem.style.border = 'solid 1px #000';
                    menuItem.innerHTML = title;
                    menuItem.id = 'si_edit_'+title.toLowerCase()+"_trigger";
                    menuItem.style.textAlign = 'center';
                    menuItem.style.cursor = 'pointer';
                    menuItem.style.paddingLeft = '5px';
                    menuItem.style.paddingRight = '5px';
                    menuItem.onclick = SI.Editor.UI.ToolsPanel.OpenToolWindow;
                }
                toolsMenu.appendChild(toolsMenuTable);
                SI.Editor.UI.MainMenu.Element.appendChild(toolsMenu);          
            },
            OpenToolWindow:function(title = null, show = true){     
                //if called from the event, title will be the event.   
                if(title.target){
                    title = this.innerHTML;
                }
                let winid = "si_edit_"+title.toLowerCase()+"_window";   //"si_edit_media_window"
                if(!SI.Widgets.Window[winid]){
                    let options;
                    switch(title){
                        case "Page":
                            options = {
                            Id: "si_edit_page_window",
                            Title: "Page",
                            Populate: SI.Editor.Objects.Page.Draw,
                            Trigger: '#si_edit_page_trigger',
                            IconImg: '/editor/media/icons/page.png'
                            };
                            break;
                        case  "Media":
                            options = {
                                Id: "si_edit_media_window",
                                Trigger: '#si_edit_tools_media',
                                Title: "Media",
                                Trigger: '#si_edit_media_trigger',
                                IconImg: '/editor/media/icons/window-media.png',
                                Populate: SI.Editor.Objects.Media.Draw,
                                Resize:SI.Editor.Objects.Media.Resize,
                            };
                            break;
                        case  "Site":
                            options = {
                                Id: "si_edit_site_window",
                                Trigger: '#si_edit_site_trigger',
                                Title: "Site",
                                IconImg: '/editor/media/icons/site.png',
                                Populate: SI.Editor.Objects.Site.Draw
                            };
                            break;
                        case "Styler":
                            options = {
                                Id: "si_edit_styler_window",
                                Trigger: '#si_edit_styler_trigger',
                                Title: "Styler",
                                IconImg: '/editor/media/icons/stylebutton.png',
                                Overflow: "hidden",
                                Populate:SI.Editor.Objects.Styler.Draw
                            };
                            break;
                        case "Scripter":
                            options = {
                                Id: "si_edit_scripter_window",
                                Trigger: '#si_edit_scripter_trigger',
                                IconImg: '/editor/media/icons/scripter-code.png',
                                Title: "Scripter",
                                Error: "This tool has issues with some browsers. It works fine in Chrome and Edge based on Chromium, Firefox has trouble parsing some of the regular expresions used.",
                                Populate:SI.Editor.Objects.Scripter.Draw                                    };
                            break;
                        case "Widgets":
                            options = {
                                Id: "si_edit_widgets_window",
                                Trigger: '#si_edit_widgets_trigger',
                                IconImg: '/editor/media/icons/widgets.png',
                                Title: "Widgets",
                                Populate:SI.Editor.Objects.Widgets.Draw
                            };
                            break;
                        case "Language":
                            options = {
                                Id: "si_edit_language_window",
                                Trigger: '#si_edit_language_trigger',
                                IconImg: '/editor/media/icons/language.png',
                                Title: "Language",
                                Populate:SI.Editor.Objects.Language.Draw
                            };
                            break;
                        case "Entities":
                            options = {
                                Id: "si_edit_entities_window",
                                Trigger: '#si_edit_entities_trigger',
                                Title: "Entities",
                                Overflow: "scroll",
                                Resize: SI.Editor.Objects.Entity.Resize,
                                Populate:SI.Editor.Objects.Entity.Draw
                            };
                            break;
                        case "Plugins":
                            options = {
                                Id: "si_edit_plugins_window",
                                Trigger: '#si_edit_plugins_trigger',
                                Title: "Plugins",
                                IconImg: '/editor/media/icons/plugins.png',
                                ResizeThickness: 5,
                                Resize:  SI.Editor.Objects.Plugins.Resize,
                                Populate: SI.Editor.Objects.Plugins.Draw,
                            };
                            break;
                        case "Security":
                            options = {
                                Id: "si_edit_security_window",
                                Trigger: '#si_edit_security_trigger',
                                Title: "Security",
                                IconImg: '/editor/media/icons/securityroles.png',
                                Populate: SI.Editor.Objects.Security.Draw
                            };
                            break;
                        case "Users":
                            options = {
                                Id: "si_edit_users_window",
                                Trigger: '#si_edit_users_trigger',
                                Title: "Users",
                                Width: '900px',
                                Populate: SI.Editor.Objects.User.Draw
                            };
                            break;
                        case "Settings":
                            options = {
                                Id: "si_edit_settings_window",
                                Trigger: '#si_edit_settings_trigger',
                                Title: "Settings",
                                Populate: SI.Editor.Objects.Settings.Draw
                            };
                            break;
                    }
                    if(options){
                        try{
                            new SI.Widget.Window(options);
                        }catch(er){
                            SI.Tools.SuperAlert("Error loading "+title+": "+er.message, 4000);
                            if(options.Error){
                                setTimeout(function(){
                                    SI.Tools.SuperAlert(options.Error, 4000);
                                },4500)
                            }
                        }
                    }
                }
                if (SI.Widgets.Window[winid].IsVisible()) {
                    SI.Widgets.Window[winid].Hide();
                    return;
                }
                if(show){
                    SI.Widgets.Window[winid].Show();
                }
            },
        },
    },
    Objects: {
    // Mystery how this is not being defined above. 
    },
    Ajax: {
        Run: function(options) {
            this.Defaults = {
                "Url": "/delegate-admin.php",
                "ContentType": "application/json",
                "Method": "POST",
                "Async": true,
                "Data": {},
            }
            options = SI.Tools.Object.SetDefaults(options, this.Defaults);
            let ajax = new XMLHttpRequest();
            //debugger;
            ajax.open(options.Method, options.Url, options.Async);
            ajax.setRequestHeader("Content-Type", options.ContentType);
            ajax.onreadystatechange = function () {
                if (ajax.readyState === 4 && ajax.status === 200) {
                      //debugger;
                    try {
                        if (ajax.responseText != null && ajax.responseText.length > 0) {
                           // console.log(ajax.responseText);
                            json = JSON.parse(ajax.responseText.trim());
                            SI.Editor.Ajax.Complete(json,options);
                        }
                    } catch (ex) {
                        console.error(ajax.responseText);
                        console.error(ex);
                        //  document.body.appendText(xhr.responseText);
                    }

                }
            };
            let stringdata = JSON.stringify(options.Data);
            //debugger;
            ajax.send(stringdata);
        },
        Complete: function (json,options) {
            //debugger;
            if(options.Callback){
                    if(json.hasOwnProperty("PARAMETER")){
                        let param = json['PARAMETER'];
                        options.Callback(param);
                    }
                    else{
                        options.Callback();
                    }
            }else{

                for (let prop in json) {
                    if (json.hasOwnProperty(prop)) {
                        let value = json[prop];
                        switch (prop) {
                            case "CREATEELEMENT": alert(" just hit: SI.Editor.Data.Tools.CreateEditorElement(prop); ");
                            case "EXCEPTION": alert(JSON.stringify(value)); break;
                            case "REFRESH": location.reload(); break;
                            case "CONSOLELOG": console.log(value); break;
                            //
                            case "PAGECREATED": SI.Editor.Objects.Page.Created(value); break;
                            case "PAGESAVED": SI.Editor.Objects.Page.Saved(value); break;
                            //Blocks
                            case "BLOCKRELATED": SI.Editor.Objects.Blocks.Created(value); break;
                            case "BLOCKSAVED": SI.Editor.Objects.Blocks.Saved(value); break; 
                            case "BLOCKREMOVED": console.log(value); break; 

                            //Common
                            case "PROMOTED": SI.Editor.Data.Objects.Deployment.Promoted(value, options); break;

                            //Media
                            case "FILEPROMOTED": let media = new SI.Editor.Objects.Media(); media.Promoted(value); break;
                            //Language
                            case 'ADDEDLANGUAGE': SI.Editor.Objects.Language.Added(value); break;
                            case 'NEWLOCALTEXT': SI.Editor.Objects.Language.Created(value); break;
                            //User
                            case 'USERCREATED': SI.Editor.Objects.User.Created(value); break;
                            case 'RETRIEVEDROLES': SI.Editor.Objects.User.SetRoles(value); break;
                            case 'UPDATEDROLES': SI.Editor.Objects.User.UpdatedRoles(value); break;
                            //Security
                            case 'ROLEDELETED': SI.Editor.Objects.Security.Deleted(value); break;
                            case 'ROLEDELETED': SI.Editor.Objects.Security.Created(value); break;
                            //Plugins
                            case 'MOREPLUGINS': SI.Editor.Objects.Plugins.Repo.StockFetchedPlugins(value); break;
                            case 'DOWNLOADEDPLUGIN': SI.Editor.Objects.Plugins.Repo.DownloadedPlugin(value); break;
                            case 'INSTALLPLUGIN': SI.Editor.Objects.Plugins.Local.Installed(value); break;
                            case 'INSTALLPLUGINFAILED': alert('Plugin install has failed'); break;
                            case 'UNINSTALLPLUGIN': SI.Editor.Objects.Plugins.Local.Uninstalled(value); break;
                            case 'UNINSTALLPLUGINFAILED': alert('Plugin removal has failed'); break;
                            //Settings
                            case 'SETTINGCREATED': SI.Editor.Objects.Settings.Created(value); break;
                            case 'SETTINGDELETED': SI.Editor.Objects.Settings.Deleted(value); break;
                            case 'BUILDINSTALLER': SI.Tools.SuperAlert(value, 2000); break;
                            case 'BACKUPDATABASE': SI.Tools.SuperAlert(value, 2000); break;
                        }
                    }
                }
            }
            //console.log(json);
            //check for lookups
            if(SI.Widgets.Lookup.Lookup){
                SI.Widgets.Lookup.Lookup.CheckLookups();
            }
        } 
    }
}
SI.Editor.Run();

<?php 
}  //End the above if admin security role  
?>
