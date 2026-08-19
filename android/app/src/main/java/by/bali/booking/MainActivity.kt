package by.bali.booking

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private val appUrl = "https://bali-booking.vercel.app/admin"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(5,6,7)
        window.navigationBarColor = Color.rgb(5,6,7)

        val root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(5,6,7)) }
        val splash = TextView(this).apply {
            text = "BALI BOOKING\nADMIN"
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            textSize = 22f
            letterSpacing = 0.12f
            setBackgroundColor(Color.rgb(5,6,7))
        }
        web = WebView(this).apply {
            setBackgroundColor(Color.rgb(5,6,7))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = true
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    splash.visibility = View.GONE
                }
            }
        }
        root.addView(web, FrameLayout.LayoutParams(-1,-1))
        root.addView(splash, FrameLayout.LayoutParams(-1,-1))
        setContentView(root)
        web.loadUrl(appUrl)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed()
    }
}
