package com.ironcircle.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "IronCircleForeground",
    permissions = {
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
    }
)
public class IronCircleForegroundPlugin extends Plugin {

    private static final String TAG = "IronCircleForegroundPlugin";

    @PluginMethod
    public void start(PluginCall call) {
        Log.d(TAG, "start() called from JS");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                requestPermissionForAlias("notifications", call, "notificationsPermissionCallback");
                return;
            }
        }
        doStart(call);
    }

    @PermissionCallback
    private void notificationsPermissionCallback(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED) {
            doStart(call);
        } else {
            call.reject("Notification permission denied.");
        }
    }

    private void doStart(PluginCall call) {
        try {
            Intent intent = buildIntent(call, IronCircleWorkoutService.ACTION_START);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            Log.d(TAG, "startForegroundService intent dispatched");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "doStart error: " + e.getMessage(), e);
            call.reject("Failed to start foreground service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void update(PluginCall call) {
        try {
            Intent intent = buildIntent(call, IronCircleWorkoutService.ACTION_UPDATE);
            getContext().startService(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "update error: " + e.getMessage(), e);
            call.reject("Failed to update foreground service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            Log.d(TAG, "stop() called from JS");
            Context ctx = getContext();
            Intent intent = new Intent(ctx, IronCircleWorkoutService.class);
            intent.setAction(IronCircleWorkoutService.ACTION_STOP);
            ctx.startService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop: " + e.getMessage(), e);
        }
    }

    /** Helper to assemble an Intent with all the extra payload from a PluginCall */
    private Intent buildIntent(PluginCall call, String action) {
        String title    = call.getString("title", "Iron Circle");
        String subtitle = call.getString("subtitle", "");
        String timer    = call.getString("timer", "");
        boolean showProgress = Boolean.TRUE.equals(call.getBoolean("showProgress", false));
        int progress    = call.getInt("progress", 0);
        int maxProgress = call.getInt("maxProgress", 100);

        Log.d(TAG, "buildIntent action=" + action + " title=" + title + " subtitle=" + subtitle
                + " timer=" + timer + " showProgress=" + showProgress
                + " progress=" + progress + "/" + maxProgress);

        Intent intent = new Intent(getContext(), IronCircleWorkoutService.class);
        intent.setAction(action);
        intent.putExtra(IronCircleWorkoutService.EXTRA_TITLE, title);
        intent.putExtra(IronCircleWorkoutService.EXTRA_SUBTITLE, subtitle);
        intent.putExtra(IronCircleWorkoutService.EXTRA_TIMER, timer);
        intent.putExtra(IronCircleWorkoutService.EXTRA_SHOW_PROGRESS, showProgress);
        intent.putExtra(IronCircleWorkoutService.EXTRA_PROGRESS, progress);
        intent.putExtra(IronCircleWorkoutService.EXTRA_MAX_PROGRESS, maxProgress);
        return intent;
    }
}
