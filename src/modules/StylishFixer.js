var StylishFixer = function()
{
  this.FixStyle();

  var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

  if (MutationObserver === undefined)
    return;

  var s_Observer = new MutationObserver(function(p_Mutations)
  {
    p_Mutations.forEach(function(p_Mutation)
    {
      if (p_Mutation.type !== 'childList')
        return;

      for (var i = 0; i < p_Mutation.removedNodes.length; ++i)
        if (p_Mutation.removedNodes[i].className.indexOf('stylish') !== -1)
          return;

      for (var i = 0; i < p_Mutation.addedNodes.length; ++i)
        if (p_Mutation.addedNodes[i].className.indexOf('stylish') !== -1)
          return;

      GSX.stylishFixer.FixStyle();
    });
  });

  var s_Config = {
    childList: true,
    characterData: true
  };

  s_Observer.observe(document.head, s_Config);
};

StylishFixer.prototype.FixStyle = function()
{
  var s_Stylish = $(document.head).find('.stylish');

  if (s_Stylish.length == 0)
    return;

  // Move stylish styles to the end of the head container.
  $(document.head).append(s_Stylish.detach());
};

var GSXmodules = window.GSXmodules = window.GSXmodules || [];

GSXmodules.push({
  name: 'Stylish Fixer',
  init: function()
  {
    GSX.stylishFixer = new StylishFixer();
  }
});