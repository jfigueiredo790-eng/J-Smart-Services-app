package com.jsmartservices.app

import android.app.Application
import android.webkit.WebView

class JSmartApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Habilitar depuração de WebView em builds de depuração
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
    }
}
