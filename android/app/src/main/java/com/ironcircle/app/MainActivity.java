package com.ironcircle.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // IMPORTANT: registerPlugin() MUST be called BEFORE super.onCreate()
        // in Capacitor 6+. Calling it after causes "plugin is not implemented on android".
        registerPlugin(IronCircleForegroundPlugin.class);

        super.onCreate(savedInstanceState);
    }
}
