/*
 * Copyright 2015-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

//
// Instantiate the AWS SDK and configuration objects.  The AWS SDK for 
// JavaScript (aws-sdk) is used for Cognito Identity/Authentication, and 
// the AWS IoT SDK for JavaScript (aws-iot-device-sdk) is used for the
// WebSocket connection to AWS IoT and device shadow APIs.
//

window.MQTT = function () {
    var that = this;
    var AWS = require('aws-sdk');
    var AWSIoTData = require('aws-iot-device-sdk');
    var AWSConfiguration = require('./aws-configuration.js');

    console.log('Loaded AWS SDK for JavaScript and AWS IoT SDK for Node.js');
    that.currentlySubscribedTopic = null;
    that.messageHistory = '';
    that.clientId = '';
    that.onMessage = null;
    AWS.config.region = AWSConfiguration.region;

    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: AWSConfiguration.poolId
    });

    that.initializeMQTTClient = function () {
        that.mqttClient = AWSIoTData.device({
            region: AWS.config.region,
            clientId: that.clientId,
            protocol: 'wss',
            maximumReconnectTimeMs: 8000,
            //
            // Enable console debugging information (optional)
            //
            debug: true,
            //
            // IMPORTANT: the AWS access key ID, secret key, and sesion token must be
            // initialized with empty strings.
            //
            accessKeyId: '',
            secretKey: '',
            sessionToken: ''
        });
        that.mqttClient.on('connect', that.mqttClientConnectHandler);
        that.mqttClient.on('reconnect', that.mqttClientReconnectHandler);
        that.mqttClient.on('message', that.mqttClientMessageHandler);
        that.mqttClient.updateWebSocketCredentials(that.awsCredentials.AccessKeyId,
            that.awsCredentials.SecretKey,
            that.awsCredentials.SessionToken);

    };

    that.initialize = function () {
        var that = this;
        that.connectAWS(function () {
            that.initializeMQTTClient();
        });
    };


//
// Attempt to authenticate to the Cognito Identity Pool.  Note that this
// example only supports use of a pool which allows unauthenticated 
// identities.
//
    that.connectAWS = function (cb) {
        that.cognitoIdentity = new AWS.CognitoIdentity();
        AWS.config.credentials.get(function (err, data) {
            if (!err) {
                console.log('retrieved identity: ' + AWS.config.credentials.identityId);
                var params = {
                    IdentityId: AWS.config.credentials.identityId
                };
                that.cognitoIdentity.getCredentialsForIdentity(params, function (err, data) {
                    if (!err) {
                        //
                        // Update our latest AWS credentials; the MQTT client will use these
                        // during its next reconnect attempt.
                        //
                        that.awsCredentials = data.Credentials;
                        cb();
                    } else {
                        console.log('error retrieving credentials: ' + err);
                        alert('error retrieving credentials: ' + err);
                    }
                });
            } else {
                console.log('error retrieving identity:' + err);
                alert('error retrieving identity: ' + err);
            }
        });
    }

//
// Connect handler; update div visibility and fetch latest shadow documents.
// Subscribe to lifecycle events on the first connect event.
//
    that.mqttClientConnectHandler = function () {
        console.log('connect');

    };

//
// Reconnect handler; update div visibility.
//
    that.mqttClientReconnectHandler = function () {
        console.log('reconnect');
    };

//
// Utility function to determine if a value has been defined.
//
    that.isUndefined = function (value) {
        return typeof value === 'undefined' || typeof value === null;
    };

//
// Message handler for lifecycle events; create/destroy divs as clients
// connect/disconnect.
//
    that.mqttClientMessageHandler = function (topic, payload) {
        var obj = JSON.parse(payload);
        console.log('message: ' + topic + ':' + obj);
        if (that.onMessage) {
            that.onMessage(obj);
        }
    };

    that.publish = function (from, message) {
        var payload = JSON.stringify({
            "from": from,
            "message": message
        });
        console.log(payload);
        that.mqttClient.publish(that.currentlySubscribedTopic, payload);
    };

//
// Handle the UI for the current topic subscription
//
    that.updateSubscriptionTopic = function (topic) {
        console.log("subscribing: " + topic);
        that.endSubscription();
        that.currentlySubscribedTopic = topic;
        that.mqttClient.subscribe(that.currentlySubscribedTopic);
    };

//
// Handle the UI to clear the history window
//
    that.clearHistory = function () {
        if (confirm('Delete message history?') === true) {
            that.messageHistory = '';
        }
    };


    that.endSubscription = function () {
        if (that.currentlySubscribedTopic) {
            that.mqttClient.unsubscribe(that.currentlySubscribedTopic);
        }
        that.currentlySubscribedTopic = null;
    }


};
