//OJO item.details.charges no esta funcionando, borrar la idea del if else
//buscar en tiempo real nombre de item (title) y highlighterarlo
//intentar asignar imagen a item por css en lugar de jquery
//probar que pasa si hay un slot de bag vacio intercalado
//testear en APIs con menos permisos
//ojo en los items falta mirar mucho, skins, upgrades, etc

var data = {
   apikey: "",
   permissions: [],
   debug: true,
   language: 'en',
   endpoints: {
      'tokenInfo': {
         service: 'tokeninfo',
         version: 'v2',
         button: 'getTokenInfo'
      },
      'account': {
         service: 'account',
         version: 'v2',
         button: 'getAccount'
      },
      'bank': {
         service: 'account/bank',
         version: 'v2',
         button: 'getAccountBank'
      },
      'wallet': {
         service: 'account/wallet',
         version: 'v2',
         button: 'getAccountWallet'
      },
      'characters': {
         service: 'characters',
         version: 'v2',
         button: 'getCharacters'
      },
      'characterInfo': {
         service: "characters/1",
         version: 'v2',
         parameters: ['characterName']
      },
      'world': {
         service: 'worlds/1',
         version: 'v2',
         parameters: ['worldId']
      },
      'guild': {
         service: 'guild_details.json?guild_id=1',
         version: 'v1',
         parameters: ['guildId']
      },
      'items': {
         service: 'items?ids=1',
         version: 'v2',
         parameters: ['itemIdsCSV']
      },
      'currencies': {
         service: 'currencies?ids=1',
         version: 'v2',
         parameters: ['currenciesIdsCSV']
      }
   }
};

$("#load-button").on('click', function() {
   loadKeyCookie();
});

$("#save-button").on('click', function() {
   createKeyCookie($("#apikey").val(), 365);
   checkKeyCookie();
});

$("#trash-button").on('click', function() {
   eraseKeyCookie();
   checkKeyCookie();
});

checkKeyCookie();

$("#apikey").on('input', function() {
   $("#save-button").css("display", "none");
   if ($("#apikey").val().length == 72) {
      updateAccount($("#apikey").val());
   }
});

$("#characters").on('change', function() {
   updateCharacter($(this).val());
});

function checkKeyCookie() {
   var apiKey = readKeyCookie();
   if (apiKey) {
      $("#load-button").css("display", "inline-block");
      $("#trash-button").css("display", "inline-block");
   } else {
      $("#load-button").css("display", "none");
      $("#trash-button").css("display", "none");
   }
   return apiKey;
}

function loadKeyCookie() {
   var apiKey = readKeyCookie();
   if (apiKey) {
      $("#apikey").val(apiKey);
      $("#apikey").trigger("input");
   }
}

function updateAccount(apikey) {
   data.apikey = apikey;
   $(".accountDisplay, .characterDisplay, .guildDisplay, .bankDisplay, .walletDisplay").css("visibility", "hidden");

   data.permissions = [];
   callAPI(data.endpoints.tokenInfo, function(tokenInfo) {
      if (!tokenInfo.id) return;
      $("#save-button").css("display", "inline-block");
      data.permissions = tokenInfo.permissions;
      callAPI(data.endpoints.account, function(account) {
         $("#accountName").html(account.name);
         updateWorld(account.world);
         $("#createdDate").html(account.created);
         if (!!~data.permissions.indexOf("characters")) {
            updateCharacters();
         }
         updateAccountGuilds(account.guilds);
         $(".accountDisplay").css("visibility", "visible");
         if (!!~data.permissions.indexOf("wallet")) {
            updateWallet();
         }
         if (!!~data.permissions.indexOf("inventories")) {
            updateAccountBank();
         }
      });
   });
}

function updateWorld(worldId) {
   callParameterAPI(data.endpoints.world, [worldId], function(world) {
      $("#worldName").html(world.name);
   });
}

function updateCharacters() {
   var select = $("#characters");
   select.prop('disabled', true);
   select.empty();
   callAPI(data.endpoints.characters, function(characters) {
      $.each(characters, function(i, name) {
         select.append($("<option/>")
            .attr("value", name).text(name));
      });
      select.prop('disabled', false);
      updateCharacter(select.val());
   });
}

function updateAccountGuilds(guildIds) {
   var guildDisplays = $(".guildDisplay");
   guildDisplays.css('visibility', 'hidden');
   $.each(guildIds, function(i, guildId) {
      callParameterAPI(data.endpoints.guild, [guildId], function(guild) {
         var guildDisplay = guildDisplays.eq(i);
         guildDisplay.find("#guildName").html(guild.guild_name);
         guildDisplay.find("#guildTag").html(guild.tag);
         guildDisplay.css('visibility', 'visible');
      });
      var guildUrl = guildEmblemUrl(guildId);
      guildDisplays.eq(i).css('background-image', 'url(' + guildUrl + ')');
   });
}

function updateWallet() {
   callAPI(data.endpoints.wallet, function(walletItems) {
      var wallet = $("#wallet .walletItems").empty();
      var walletItemIds = [];
      $.each(walletItems, function(i, item) {
         var itemHtml = $("#htmlTemplates .walletItem").clone();
         if (item != null) {
            itemHtml.find("img").addClass("currency" + item.id);
            itemHtml.find(".value").html(item.value.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));
            if (!walletItemIds.hasOwnProperty(item.id)) {
               walletItemIds.push(item.id);
            }
         }
         itemHtml.appendTo(wallet);
      });
      callParameterAPI(data.endpoints.currencies, [walletItemIds.join()], function(currencies) {
         $.each(currencies, function(i, currency) {
            var itemEl = $("#wallet .currency" + currency.id);
            itemEl.attr('title', currency.name);
            itemEl.attr("src", currency.icon);
         });
      });
      $("#wallet").css("visibility", "visible");
   });
}

function updateAccountBank() {
   callAPI(data.endpoints.bank, function(bankItems) {
      var inventory = $("#bank .items").empty();
      var itemIds = [];
      $.each(bankItems, function(i, item) {
         var itemHtml = $("#htmlTemplates .item").clone();
         if (item != null) {
            itemHtml.find("img").addClass("item" + item.id);
            if (item.details != null && item.details.charges != null) {
               itemHtml.find(".count").html(item.details.charges);  
            } else {
               itemHtml.find(".count").html(item.count);  
            }
            if (!itemIds.hasOwnProperty(item.id)) {
               itemIds.push(item.id);
            }
         }
         itemHtml.appendTo(inventory);
      });
      if (itemIds.length > 0) {
         callParameterAPI(data.endpoints.items, [itemIds.join()], function(items) {
            $.each(items, function(i, item) {
               var itemEl = $("#bank .item" + item.id);
               itemEl.attr('title', item.name);
               itemEl.attr("src", item.icon);
               //itemEl.css('background-image', 'url(' + item.icon + ')');
            });
         });
      }
      $("#bank").css("visibility", "visible");
   });
}

function updateCharacter(character) {
   callParameterAPI(data.endpoints.characterInfo, [character], function(character) {
      $("#characterName").html(character.name);
      if (character.crafting) {
         var craftingInfos = [];
         var offCraftingInfos = [];
         $.each(character.crafting, function(i, crafting) {
            var info = crafting.discipline + " (" + crafting.rating + ")";
            if (crafting.active) {
               craftingInfos.push(info);
            } else {
               offCraftingInfos.push(info);
            }
         });
         var info = craftingInfos.join(", ");
         if (offCraftingInfos.length) {
            info += " - disabled: " + offCraftingInfos.join(", ");
         }
         $("#craftingInfo").html(info);
      } else {
         $("#craftingInfo").html("None");
      }

      if (character.guild) {
         callParameterAPI(data.endpoints.guild, [character.guild], function(guild) {
            $(".characterDisplay #guildName").html(guild.guild_name);
            $(".characterDisplay #guildTag").html(guild.tag);
            $(".representing").css('visibility', 'visible');
         });
         var guildUrl = guildEmblemUrl(character.guild);
         $(".characterDisplay").css('background-image', 'url(' + guildUrl + ')').css('background-position', '25% 0').css('background-size', '25%');
      } else {
         $(".representing").css('visibility', 'hidden');
         $(".characterDisplay").css('background-image', 'none');
         $(".characterDisplay #guildName").empty();
         $(".characterDisplay #guildTag").empty();
      }
      $(".characterDisplay").css('visibility', 'visible');
      $(".characterDisplay #equipment").empty();
      $(".characterDisplay #inventory").empty();
      if (character.equipment) {
         updateEquipment(character.equipment);
      }
      if (character.bags) {
         updateInventory(character.bags);
      }
   });
}

function updateEquipment(equipment) {
   $(".characterDisplay #equipment").empty();
   $("#htmlTemplates .equipmentTemplate").children().clone().appendTo($(".characterDisplay #equipment"));
   $("#equipment img").removeClass().attr('title', '').attr('src', '');
   var itemIds = [];
   $.each(equipment, function(i, equipped) {
      //$("#equipment #"+equipped.slot.toLowerCase()).html(equipped.slot+":"+equipped.id);
      $("#equipment #" + equipped.slot.toLowerCase()).addClass("item" + equipped.id);
      if (!itemIds.hasOwnProperty(equipped.id)) {
         itemIds.push(equipped.id);
      }
   });
   if (itemIds.length > 0) {
      callParameterAPI(data.endpoints.items, [itemIds.join()], function(items) {
         $.each(items, function(i, item) {
            var itemEl = $("#equipment .item" + item.id);
            itemEl.attr('title', item.name);
            itemEl.attr("src", item.icon);
            //itemEl.css('background-image', 'url(' + item.icon + ')');
         });
      });
   }
}

function updateInventory(bags) {
   var inventory = $(".characterDisplay #inventory").empty();
   var itemIds = [];
   $.each(bags, function(i, bag) {
      var bagHtml = $("#htmlTemplates div.bag").clone();
      if (bag) {
         bagHtml.find("img.bag").addClass("item" + bag.id);
         if (!itemIds.hasOwnProperty(bag.id)) {
            itemIds.push(bag.id);
         }
         var items = bagHtml.find(".items");
         $.each(bag.inventory, function(i, item) {
            var itemHtml = $("#htmlTemplates .item").clone();
            if (item != null) {
               itemHtml.find("img").addClass("item" + item.id);
               if (item.details && item.details.charges) {
                  itemHtml.find(".count").html(item.details.charges);
               } else {
                  itemHtml.find(".count").html(item.count);
               }
               if (!itemIds.hasOwnProperty(item.id)) {
                  itemIds.push(item.id);
               }
            }
            itemHtml.appendTo(items);
         });
      }
      bagHtml.appendTo(inventory);
   });
   if (itemIds.length > 0) {
      callParameterAPI(data.endpoints.items, [itemIds.join()], function(items) {
         $.each(items, function(i, item) {
            var itemEl = $("#inventory .item" + item.id);
            itemEl.attr('title', item.name);
            itemEl.attr("src", item.icon);
            //itemEl.css('background-image', 'url(' + item.icon + ')');
         });
      });
   }
}

$.each(data.endpoints, function(i, endpoint) {
   if (!data.debug || !endpoint.button) {
      return;
   }
   var button = $('<button/>')
      .text(endpoint.service)
      .click(function() {
         try {
            if (!data.apikey) {
               return;
            }
            var json = callAPI(endpoint);
         } catch (e) {
            alert(e);
         }
      });
   $("#buttons").append(button);
});

var dialogApikey = $("#dialog-apikey").dialog({
   autoOpen: false,
   width: 500
});
$("#apikeyHelp").click(function() {
   dialogApikey.dialog("open");
});

function guildEmblemUrl(guildId, size) {
   if (!size) {
      size = 150;
   }
   return "http://guilds.gw2w2w.com/" + guildId + "." + size + ".svg";
}

function callAPI(serviceData, callback) {
   return callParameterAPI(serviceData, [], callback);
}

function callParameterAPI(serviceData, parameters, callback) {
   var service = serviceData.service;
   $.each(parameters, function(i, param) {
      service = service.replace((i + 1), param);
   });
   var url = "https://api.guildwars2.com/" + serviceData.version + "/" + service;
   return $.ajax({
      dataType: "json",
      type: 'GET',
      url: url,
      jsonp: false,
      data: {
         access_token: data.apikey
      },
      success: function(data) {
         $("#textOutput").val(JSON.stringify(data, null, 2) + "\n\n" + $("#textOutput").val());
         if (callback) {
            callback(data);
         }
      },
      error: function(jqXHR, textStatus, errorThrown) {
         console.log("ERROR: " + textStatus + ' : ' + errorThrown + ' ' + JSON.stringify(jqXHR, null, 1));
      }
   });
}

function createKeyCookie(value, days) {
   if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      var expires = "; expires=" + date.toGMTString();
   } else var expires = "";
   document.cookie = "savedGW2APIKey" + "=" + value + expires + "; path="+document.domain+'/'+document.location.pathname.split('/')[1];
}

function readKeyCookie() {
   var name = "savedGW2APIKey";
   var nameEQ = name + "=";
   var ca = document.cookie.split(';');
   for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
   }
   return null;
}

function eraseKeyCookie() {
   var name = "savedGW2APIKey";
   createKeyCookie("", -1);
}