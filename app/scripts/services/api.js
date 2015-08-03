'use strict';

/**
 * @ngdoc service
 * @name grademanagerApp.API
 * @description
 * # API
 * Service in the grademanagerApp.
 */
angular.module('grademanagerApp')
  .service('API', function ($http, $timeout, $window, $rootScope, $mdDialog, $mdToast) {
    var self = this;
    self.URL = 'http://192.168.56.101:9001';
    self.project = false;
    self.options = {
      users: [],
      options: {},
      status: {}
    };
    self.connected = {};
    self.logs = {};
    self.sortedLogs = [];

    self.getProjectList = function(){
      return $http.get(self.URL + '/project/list');
    };

    self.createProject = function(project){
      return $http.post(self.URL + '/project/create', {project: project});
    };


    self.getLog = function(name) {
        if(!self.logs.hasOwnProperty(name)){
            self.logs[name] = {
                msg: name,
                log: '',
                err: '',
                progress: 0,
                start: new Date()
            };
            self.sortedLogs.unshift(self.logs[name]);
        }
        return self.logs[name];
    };

    self.getDownloadZipURL = function(){
        return self.URL + '/project/' + self.project + '/zip/pdf?token=' + $window.localStorage.getItem('jwtToken');
    };

    self.loadProject = function(project){
      if (self.project !== project) {
        self.project = project;
        self.PROJECT_URL = self.URL + '/project/' + self.project;
        self.socket = io.connect(self.URL + '?token='+ $window.localStorage.getItem('jwtToken'));

        self.loadOptions();

        self.socket.on('error', function(error) {
            console.log('socket error:', error);
        });

        self.socket.on('user:online', function(data){
            self.connected = data;
            $rootScope.$apply();
        });

        self.socket.on('user:connected', function(data){
            self.connected[data.id] = data;
            $rootScope.$apply();
        });

        self.socket.on('user:disconnected', function(data){
            delete self.connected[data.id];
            $rootScope.$apply();
        });



        self.socket.on('log', function(log){
            var logLocal = self.getLog(log.msg);

            if (log.action === 'start') {
                logLocal.command = log.command;
                logLocal.params = log.params;
            }

            if (log.action === 'log') {
                var regex = /===<.*?>=\+(.*)/g;
                var match = regex.exec(log.data);

                if (match){
                    logLocal.progress += parseFloat(match[1]);
                } else {
                    logLocal.log += log.data + '\n';
                    if (log.command === 'prepare') {
                        logLocal.progress+=0.001;
                    }
                }
            }

            if (log.action === 'err') {
                self.logs[log.msg].err += log.data;
            }

            if (log.action === 'end') {
                logLocal.code = log.code;
                logLocal.progress = 1;
                logLocal.end = new Date();
                if (log.code > 0){
                    self.options.status.locked = 0;
                    //display error
                }
            }

            $rootScope.$apply();
        });

        var printTimer;
        self.socket.on('print', function(event){
            if (event.action === 'start') {
                self.sortedLogs = [];
                self.logs = {};
                printTimer = new Date();
                self.options.status.locked = 1;
                self.options.status.printed = undefined;
                self.showProgressDialog();
            }
            if (event.action === 'end') {
                self.sortedLogs.unshift({
                    start: printTimer,
                    end: new Date(),
                    command: 'print',
                    msg: 'printing done',
                    log: event.pdfs.join('\n'),
                    progress: 1
                });
                self.options.status.locked = 0;
                self.options.status.printed = new Date().getTime();
            }
            $rootScope.$apply();
        });

        self.socket.emit('listen', self.project);
      }
    };
    self.showProgressDialog = function(){
         $mdDialog.show({
            clickOutsideToClose: false,
            escapeToClose: false,
            hasBackdrop: true,
            templateUrl: 'views/progressdialog.html',
            controller: 'ProgressDialogCtrl',
            controllerAs: 'ctrl'
          });
    };

    self.loadOptions = function(){
      $http.get(self.URL + '/project/' + self.project + '/options')
      .success(function(data){
        self.options.users = data.users || [];
        self.options.users.sort();
        self.options.options = data.options || {};
        self.options.status = data.status || {};
        console.log( data.status );
        if(self.options.status.locked > 0){
            self.showProgressDialog();
        }
      });
    };

    self.preview = function(data){
        return $http.post(self.URL + '/project/' + self.project + '/preview', data);
    };

    self.print = function(data){
        return $http.post(self.URL + '/project/' + self.project + '/print', data)
        .error(function(msg){
            $mdToast.show($mdToast.simple().content(msg).position('top right'));
        });
    };


    self.addUser = function(username, project){
      return $http.post(self.URL + '/project/' + project + '/add', {username: username});
    };

    self.removeUser = function(username, project){
      return $http.post(self.URL + '/project/' + project + '/remove', {username: username});
    };

    self.setZoneManual = function(project, zone){
      return $http.post(self.URL + '/project/' + project + '/capture/setmanual', zone);
    };

    self.setPageAuto = function(project, page){
      return $http.post(self.URL + '/project/' + project + '/capture/setauto', page);
    };


  });
