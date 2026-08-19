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
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private val appUrl = "https://bali-booking.vercel.app/admin"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(4,5,5)
        window.navigationBarColor = Color.rgb(4,5,5)

        val root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(4,5,5)) }
        val splash = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.rgb(4,5,5))
            addView(ImageView(context).apply {
                setImageResource(by.bali.booking.R.drawable.bali_booking_icon)
                scaleType = ImageView.ScaleType.CENTER_INSIDE
            }, LinearLayout.LayoutParams(128.dp(),128.dp()).apply { bottomMargin = 20.dp() })
            addView(TextView(context).apply {
                text = "BALI BOOKING"
                gravity = Gravity.CENTER
                setTextColor(Color.WHITE)
                textSize = 22f
                letterSpacing = 0.15f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            addView(TextView(context).apply {
                text = "ADMIN"
                gravity = Gravity.CENTER
                setTextColor(Color.rgb(152,163,160))
                textSize = 9f
                letterSpacing = 0.32f
            }, LinearLayout.LayoutParams(-2,-2).apply { topMargin = 8.dp() })
        }

        web = WebView(this).apply {
            setBackgroundColor(Color.rgb(4,5,5))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = true
            settings.setSupportZoom(false)
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    splash.animate().alpha(0f).setDuration(180).withEndAction { splash.visibility = View.GONE }.start()
                }
            }
        }
        root.addView(web, FrameLayout.LayoutParams(-1,-1))
        root.addView(splash, FrameLayout.LayoutParams(-1,-1))
        setContentView(root)
        web.loadUrl(appUrl)
    }

    private fun Int.dp(): Int = (this * resources.displayMetrics.density).toInt()

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed()
    }
}
