##О проекте##
Данный проект демонстрирует какие строительные материалы доминируют в том или ином городе.

Проект построен на базе [API карт 2ГИС](https://github.com/2gis/mapsapi) с использованием плагина для leaflet [heatmap.js](http://www.patrick-wied.at/static/heatmapjs/).


###Деплой###
Настроить nginx на раздачу ресурсов из следующийх директорий:
* ``/index.html``
* ``/public/**``
* ``/images/**``
* ``/fonts/**``
* ``/MaterialsApp/data/cities/**``
 
При деплое в папку fonts добавить шрифт SuisseIntl-Cond
