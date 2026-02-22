package com.ironcircle.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class IronCircleWorkoutService extends Service {
    private static final String TAG = "IronCircleWorkoutService";
    private static final String CHANNEL_ID = "iron_circle_workout_channel";
    private static final int NOTIFICATION_ID = 4001;

    public static final String ACTION_START = "ACTION_START";
    public static final String ACTION_UPDATE = "ACTION_UPDATE";
    public static final String ACTION_STOP = "ACTION_STOP";

    public static final String EXTRA_TITLE = "EXTRA_TITLE";
    public static final String EXTRA_SUBTITLE = "EXTRA_SUBTITLE";
    public static final String EXTRA_TIMER = "EXTRA_TIMER";
    public static final String EXTRA_SHOW_PROGRESS = "EXTRA_SHOW_PROGRESS";
    public static final String EXTRA_PROGRESS = "EXTRA_PROGRESS";
    public static final String EXTRA_MAX_PROGRESS = "EXTRA_MAX_PROGRESS";

    private NotificationManager notificationManager;
    private NotificationCompat.Builder builder;
    private PendingIntent pendingIntent;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service created");
        notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        createNotificationChannel();

        Intent notifIntent = new Intent(this, MainActivity.class);
        int piFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                : PendingIntent.FLAG_UPDATE_CURRENT;
        pendingIntent = PendingIntent.getActivity(this, 0, notifIntent, piFlags);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || intent.getAction() == null) {
            Log.w(TAG, "onStartCommand with null intent");
            return START_NOT_STICKY;
        }
        String action = intent.getAction();
        Log.d(TAG, "onStartCommand action=" + action);

        switch (action) {
            case ACTION_START:
                handleStart(intent);
                break;
            case ACTION_UPDATE:
                handleUpdate(intent);
                break;
            case ACTION_STOP:
                handleStop();
                break;
        }
        return START_NOT_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Active Workout Tracker",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps your Iron Circle workout active.");
            channel.setSound(null, null);
            channel.enableVibration(false);
            // Show full notification content on the lock screen
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private NotificationCompat.Builder buildNotification(Intent intent) {
        String title = intent.getStringExtra(EXTRA_TITLE);
        String subtitle = intent.getStringExtra(EXTRA_SUBTITLE);
        String timer = intent.getStringExtra(EXTRA_TIMER);
        boolean showProgress = intent.getBooleanExtra(EXTRA_SHOW_PROGRESS, false);
        int progress = intent.getIntExtra(EXTRA_PROGRESS, 0);
        int maxProgress = intent.getIntExtra(EXTRA_MAX_PROGRESS, 100);

        // Use the round launcher icon as the large icon (left-hand big icon, like Strava)
        Bitmap largeIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher_round);

        // Build the second line: "subtitle  •  timer"
        String contentText = (subtitle != null ? subtitle : "") +
                (timer != null && !timer.isEmpty() ? "  •  " + timer : "");

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_onesignal_default) // monochrome status bar icon
                .setLargeIcon(largeIcon)                            // coloured app icon in body
                .setContentTitle(title != null ? title : "Iron Circle")
                .setContentText(contentText)
                .setSubText(timer)                                  // appears top-right, like "1m"
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)  // Show on lock screen
                .setPriority(NotificationCompat.PRIORITY_LOW);

        if (showProgress) {
            b.setProgress(maxProgress, progress, false);
        }

        return b;
    }

    private void handleStart(Intent intent) {
        try {
            builder = buildNotification(intent);
            Notification notification = builder.build();
            notification.flags |= Notification.FLAG_NO_CLEAR | Notification.FLAG_ONGOING_EVENT;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
            Log.d(TAG, "Foreground service started successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start: " + e.getMessage(), e);
        }
    }

    private void handleUpdate(Intent intent) {
        if (notificationManager == null) return;
        try {
            builder = buildNotification(intent);
            Notification notification = builder.build();
            notification.flags |= Notification.FLAG_NO_CLEAR | Notification.FLAG_ONGOING_EVENT;
            notificationManager.notify(NOTIFICATION_ID, notification);
        } catch (Exception e) {
            Log.e(TAG, "Failed to update: " + e.getMessage(), e);
        }
    }

    private void handleStop() {
        Log.d(TAG, "Stopping foreground service");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            //noinspection deprecation
            stopForeground(true);
        }
        stopSelf();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
