package com.jsmartservices.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.webkit.JavascriptInterface
import android.widget.Toast

class WebAppInterface(private val context: Context) {

    private val mainHandler = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun showToast(message: String) {
        val safeMsg = message.take(160)
        mainHandler.post {
            Toast.makeText(context, safeMsg, Toast.LENGTH_SHORT).show()
        }
    }

    @JavascriptInterface
    fun vibrate(milliseconds: Long) {
        val safeDuration = milliseconds.coerceIn(10L, 1000L)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator?.vibrate(
                    VibrationEffect.createOneShot(safeDuration, VibrationEffect.DEFAULT_AMPLITUDE)
                )
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                vibrator?.vibrate(safeDuration)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @JavascriptInterface
    fun shareText(title: String, text: String) {
        val safeTitle = title.take(200)
        val safeText = text.take(2000)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, safeTitle)
            putExtra(Intent.EXTRA_TEXT, safeText)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(Intent.createChooser(intent, safeTitle).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        })
    }

    @JavascriptInterface
    fun openWhatsApp(phoneNumber: String, message: String) {
        try {
            val cleanPhone = phoneNumber.replace(Regex("[^0-9]"), "")
            if (cleanPhone.length !in 9..15) {
                showToast("Número de telefone inválido.")
                return
            }
            val safeMessage = message.take(1000)
            val uri = Uri.parse("https://api.whatsapp.com/send?phone=$cleanPhone&text=${Uri.encode(safeMessage)}")
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            showToast("Não foi possível abrir o WhatsApp")
        }
    }

    @JavascriptInterface
    fun getPlatform(): String {
        return "android"
    }

    @JavascriptInterface
    fun getAppVersion(): String {
        return "1.0.0"
    }
}
